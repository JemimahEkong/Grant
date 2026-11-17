import { assertSameOrigin } from "../../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db/client";
import { RepositoryError } from "../../../../../lib/db/errors";
import { consumeRateLimit } from "../../../../../lib/db/rate-limit";
import { finalizeSettlement, getPurchaseForOwner } from "../../../../../lib/db/repositories";
import { jsonSafe } from "../../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../../lib/http";
import { getHorizonTransaction, verifyTransferDelta } from "../../../../../lib/payments/verify-settlement";

export const runtime = "nodejs";
export const maxDuration = 60;

type StoredSettlementMetadata = {
  settlement?: {
    success?: boolean;
    payer?: string;
    transaction?: string;
    network?: string;
  };
  buyer?: string;
  payee?: string;
  amountBaseUnits?: string;
  network?: string;
  assetContractId?: string;
  buyerBefore?: string;
  sellerBefore?: string;
};

function isSettled(status: string) {
  return status === "settled" || status === "issuing" || status === "ready";
}

function pending(code: string, attemptId: string | null) {
  return jsonResponse(
    {
      code,
      attemptId,
      purchaseStatus: "payment_pending",
      retryPolicy: "No new signature. Reconcile this same attempt.",
    },
    202,
  );
}

export async function POST(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "reconcile" });
    const view = await getPurchaseForOwner(db, { ownerId: auth.ownerId, purchaseId });

    if (isSettled(view.purchase.status)) {
      return jsonResponse(
        jsonSafe({ code: "ALREADY_SETTLED", purchase: view.purchase, receipt: view.receipt, license: view.license }),
        200,
      );
    }
    if (view.purchase.status !== "reserved" && view.purchase.status !== "payment_pending") {
      throw new RepositoryError("PURCHASE_NOT_PENDING", "Only a pending purchase can be reconciled.", 409);
    }
    if (!view.purchase.payeeAddress) {
      throw new RepositoryError("PAYEE_NOT_CONFIGURED", "The purchase has no seller payee.", 422);
    }

    const attempt = view.attempts.at(-1);
    if (!attempt) return pending("NO_ATTEMPT", null);
    if (!attempt.transactionHash || !attempt.providerReference) {
      return pending("OPERATOR_REVIEW_REQUIRED", attempt.id);
    }

    let metadata: StoredSettlementMetadata;
    try {
      metadata = JSON.parse(attempt.providerReference) as StoredSettlementMetadata;
    } catch {
      return pending("OPERATOR_REVIEW_REQUIRED", attempt.id);
    }

    const settlement = metadata.settlement;
    if (
      !settlement?.success ||
      settlement.network !== view.purchase.network ||
      settlement.payer !== metadata.buyer ||
      !metadata.buyer ||
      !metadata.buyerBefore ||
      !metadata.sellerBefore ||
      metadata.amountBaseUnits !== view.purchase.priceBaseUnits.toString() ||
      metadata.payee !== view.purchase.payeeAddress
    ) {
      return pending("SETTLEMENT_EVIDENCE_INCOMPLETE", attempt.id);
    }

    const onChain = await getHorizonTransaction(attempt.transactionHash);
    if (!onChain?.successful) return pending("SETTLEMENT_NOT_CONFIRMED_ON_CHAIN", attempt.id);

    const delta = await verifyTransferDelta({
      buyerPublicKey: metadata.buyer,
      sellerPublicKey: view.purchase.payeeAddress,
      amountBaseUnits: view.purchase.priceBaseUnits,
      buyerBefore: metadata.buyerBefore,
      sellerBefore: metadata.sellerBefore,
    });
    if (!delta.verified) return pending("SETTLEMENT_BALANCE_MISMATCH", attempt.id);

    const finalized = await finalizeSettlement(db, {
      ownerId: auth.ownerId,
      purchaseId,
      attemptId: attempt.id,
      network: view.purchase.network,
      assetContractId: view.purchase.assetContractId,
      payeeAddress: view.purchase.payeeAddress,
      amountBaseUnits: view.purchase.priceBaseUnits.toString(),
      transactionHash: attempt.transactionHash,
      settlementReference: `stellar:testnet:${attempt.transactionHash}:0`,
      authorizationDigest: attempt.authorizationDigest,
      ledger: BigInt(onChain.ledger),
      verificationSource: "horizon+balance_delta+reconcile",
      verifiedAt: new Date(onChain.createdAt),
      safeMetadata: {
        settlement,
        horizon: onChain,
        balances: {
          buyerBefore: metadata.buyerBefore,
          sellerBefore: metadata.sellerBefore,
          buyerAfter: delta.buyerAfter,
          sellerAfter: delta.sellerAfter,
        },
        reconciled: true,
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
