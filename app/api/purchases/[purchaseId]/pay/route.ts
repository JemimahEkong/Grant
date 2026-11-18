import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer, getNetworkPassphrase } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { assertSameOrigin } from "../../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db/client";
import { sha256Raw } from "../../../../../lib/db/crypto";
import { RepositoryError } from "../../../../../lib/db/errors";
import { consumeRateLimit } from "../../../../../lib/db/rate-limit";
import {
  claimAttemptAndReserve,
  finalizeSettlement,
  getPurchaseForOwner,
  markSigningStarted,
  recordAttemptAuthorization,
  recordAttemptSubmission,
} from "../../../../../lib/db/repositories";
import { jsonSafe } from "../../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../../lib/http";
import { createAttemptToken } from "../../../../../lib/payments/attempt-token";
import { decryptOwnerSecret, requireFundedWallet } from "../../../../../lib/wallet/service";
import { usdcBaseUnits } from "../../../../../lib/wallet/stellar";
import { paymentsEnabled } from "../../../../../lib/payments/flags";
import { getHorizonTransaction, getUsdcBalance, verifyTransferDelta } from "../../../../../lib/payments/verify-settlement";

export const runtime = "nodejs";
export const maxDuration = 60;

const network = "stellar:testnet";
const rpcUrl = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";

function isSettled(status: string) {
  return status === "settled" || status === "issuing" || status === "ready";
}

function pending(purchaseId: string, attemptId: string | null, code: string, status = 202) {
  return jsonResponse(
    {
      code,
      purchaseId,
      attemptId,
      purchaseStatus: "payment_pending",
      statusUrl: `/api/purchases/${purchaseId}`,
      retryPolicy: "Do not start a new payment. Reconcile this attempt.",
    },
    status,
  );
}

export async function POST(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    if (!paymentsEnabled()) {
      throw new RepositoryError("PAYMENTS_DISABLED", "Payments are disabled.", 503);
    }
    const { purchaseId } = await context.params;
    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "pay" });
    const current = await getPurchaseForOwner(db, { ownerId: auth.ownerId, purchaseId });

    if (isSettled(current.purchase.status)) {
      return jsonResponse(
        jsonSafe({
          code: "PURCHASE_ALREADY_SETTLED",
          purchase: current.purchase,
          receipt: current.receipt,
          license: current.license,
        }),
        200,
      );
    }
    if (current.purchase.status === "reserved" || current.purchase.status === "payment_pending") {
      return pending(purchaseId, current.attempts.at(-1)?.id ?? null, "PAYMENT_IN_PROGRESS");
    }
    if (current.purchase.status !== "approved") {
      throw new RepositoryError("APPROVAL_REQUIRED", "The purchase must be approved before payment.", 409);
    }
    if (!current.purchase.payeeAddress) {
      throw new RepositoryError("PAYEE_NOT_CONFIGURED", "The purchase has no seller payee.", 422);
    }

    const walletState = await requireFundedWallet(db, auth.ownerId);
    if (usdcBaseUnits(walletState.balance) < current.purchase.priceBaseUnits) {
      throw new RepositoryError(
        "INSUFFICIENT_BALANCE",
        "The wallet balance does not cover this purchase.",
        422,
        { balance: walletState.balance, priceBaseUnits: current.purchase.priceBaseUnits.toString() },
      );
    }
    const buyerSecret = decryptOwnerSecret(walletState.wallet);

    const reserve = await claimAttemptAndReserve(db, { ownerId: auth.ownerId, purchaseId });
    if (reserve.outcome !== "reserved") {
      return jsonResponse(jsonSafe(reserve), reserve.outcome === "refused" ? 422 : 409);
    }

    const signing = await markSigningStarted(db, {
      ownerId: auth.ownerId,
      purchaseId,
      attemptId: reserve.attempt.id,
    });
    if (signing.outcome !== "signing_started") {
      return jsonResponse(jsonSafe(signing), 409);
    }

    const purchase = reserve.purchase;
    const payeeAddress = purchase.payeeAddress;
    if (!payeeAddress) {
      throw new RepositoryError("PAYEE_NOT_CONFIGURED", "The purchase has no seller payee.", 422);
    }
    const token = createAttemptToken({
      purchaseId: purchase.id,
      attemptId: reserve.attempt.id,
      priceBaseUnits: purchase.priceBaseUnits.toString(),
      network,
      assetContractId: purchase.assetContractId,
      payeeAddress,
    });

    const sellerBase = process.env.X402_SELLER_BASE_URL ?? process.env.APP_ORIGIN ?? new URL(request.url).origin;
    const sellerUrl = new URL("/api/x402/license", sellerBase);
    sellerUrl.searchParams.set("token", token);

    const signer = createEd25519Signer(buyerSecret, network);
    const client = new x402Client().register(
      "stellar:*",
      new ExactStellarScheme(signer, { url: rpcUrl }),
    );
    const httpClient = new x402HTTPClient(client);

    const buyerBefore = await getUsdcBalance(signer.address);
    const sellerBefore = await getUsdcBalance(payeeAddress);

    let paymentPayload: Awaited<ReturnType<typeof client.createPaymentPayload>> | null = null;
    let authorizationDigest: string | null = null;

    try {
      const quoteResponse = await fetch(sellerUrl.toString());
      if (quoteResponse.status !== 402) {
        return pending(purchaseId, reserve.attempt.id, "SELLER_QUOTE_UNAVAILABLE");
      }
      const paymentRequired = httpClient.getPaymentRequiredResponse(name => quoteResponse.headers.get(name));
      const selected = paymentRequired.accepts?.[0];
      if (!selected) throw new Error("The seller quote did not include payment requirements.");
      if (
        selected.network !== network ||
        selected.payTo !== payeeAddress ||
        selected.amount !== purchase.priceBaseUnits.toString() ||
        selected.asset !== purchase.assetContractId
      ) {
        throw new Error("The seller requirements do not match the approved purchase.");
      }

      paymentPayload = await client.createPaymentPayload(paymentRequired);
      const networkPassphrase = getNetworkPassphrase(network);
      const encodedTransaction = paymentPayload.payload.transaction as string;
      const transaction = new Transaction(encodedTransaction, networkPassphrase);
      const envelope = transaction.toEnvelope();
      if (envelope.type !== "envelopeTypeTx") throw new Error("Expected a v1 transaction envelope.");
      const extension = envelope.value.tx.ext;
      const sorobanData = extension.type === "sorobanData" ? extension.value : undefined;
      if (sorobanData) {
        paymentPayload = {
          ...paymentPayload,
          payload: {
            ...paymentPayload.payload,
            transaction: TransactionBuilder.cloneFrom(transaction, {
              fee: "1",
              sorobanData,
              networkPassphrase,
            })
              .build()
              .toXDR(),
          },
        };
      }

      authorizationDigest = sha256Raw(encodedTransaction);
      await recordAttemptAuthorization(db, {
        ownerId: auth.ownerId,
        purchaseId,
        attemptId: reserve.attempt.id,
        authorizationDigest,
        authorizationValidUntil: new Date(Date.now() + 5 * 60 * 1000),
      });
    } catch {
      return pending(purchaseId, reserve.attempt.id, "SIGNING_OR_QUOTE_PENDING");
    }

    if (!paymentPayload || !authorizationDigest) {
      return pending(purchaseId, reserve.attempt.id, "SIGNING_OR_QUOTE_PENDING");
    }

    const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
    let paidResponse: Response;
    try {
      paidResponse = await fetch(sellerUrl.toString(), { method: "GET", headers: paymentHeaders });
    } catch {
      return pending(purchaseId, reserve.attempt.id, "PAYMENT_SUBMISSION_PENDING");
    }

    if (paidResponse.status !== 200) {
      return pending(purchaseId, reserve.attempt.id, "PAYMENT_VERIFICATION_PENDING");
    }

    let settlement;
    try {
      settlement = httpClient.getPaymentSettleResponse(name => paidResponse.headers.get(name));
    } catch {
      return pending(purchaseId, reserve.attempt.id, "SETTLEMENT_HEADER_MISSING");
    }
    const transactionHash = settlement?.transaction;
    if (!transactionHash) {
      return pending(purchaseId, reserve.attempt.id, "SETTLEMENT_TRANSACTION_MISSING");
    }

    await recordAttemptSubmission(db, {
      ownerId: auth.ownerId,
      purchaseId,
      attemptId: reserve.attempt.id,
      transactionHash,
      settlementMetadata: {
        settlement,
        buyer: signer.address,
        payee: purchase.payeeAddress,
        amountBaseUnits: purchase.priceBaseUnits.toString(),
        network,
        assetContractId: purchase.assetContractId,
        buyerBefore,
        sellerBefore,
        recordedAt: new Date().toISOString(),
      },
    });

    const onChain = await getHorizonTransaction(transactionHash);
    if (!onChain?.successful) {
      return pending(purchaseId, reserve.attempt.id, "SETTLEMENT_NOT_CONFIRMED_ON_CHAIN");
    }
    if (settlement?.payer !== signer.address || settlement?.network !== network) {
      return pending(purchaseId, reserve.attempt.id, "SETTLEMENT_IDENTITY_MISMATCH");
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
    const delta = await verifyTransferDelta({
      buyerPublicKey: signer.address,
      sellerPublicKey: payeeAddress,
      amountBaseUnits: purchase.priceBaseUnits,
      buyerBefore,
      sellerBefore,
    });
    if (!delta.verified) {
      return pending(purchaseId, reserve.attempt.id, "SETTLEMENT_BALANCE_MISMATCH");
    }

    const finalized = await finalizeSettlement(db, {
      ownerId: auth.ownerId,
      purchaseId,
      attemptId: reserve.attempt.id,
      network,
      assetContractId: purchase.assetContractId,
      payeeAddress,
      amountBaseUnits: purchase.priceBaseUnits.toString(),
      transactionHash,
      settlementReference: `stellar:testnet:${transactionHash}:0`,
      authorizationDigest,
      ledger: BigInt(onChain.ledger),
      verificationSource: "horizon+balance_delta",
      verifiedAt: new Date(onChain.createdAt),
      safeMetadata: {
        settlement,
        horizon: onChain,
        balances: {
          buyerBefore,
          sellerBefore,
          buyerAfter: delta.buyerAfter,
          sellerAfter: delta.sellerAfter,
        },
      },
    });

    return jsonResponse(
      jsonSafe({
        outcome: "settled",
        purchase: finalized.purchase,
        receipt: finalized.receipt,
        license: finalized.license,
        idempotent: finalized.idempotent,
      }),
      200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
