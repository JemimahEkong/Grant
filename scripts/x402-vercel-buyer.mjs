import fs from "node:fs";
import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer, getNetworkPassphrase } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const network = "stellar:testnet";
const rpcUrl = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const horizonUrl = "https://horizon-testnet.stellar.org";
const targetUrl = process.env.X402_SPIKE_URL ?? "https://grant-roan.vercel.app/api/x402/spike";
const buyerSecret = process.env.G0_BUYER_SECRET;
const sellerPublic = process.env.X402_SELLER_PUBLIC ?? process.env.G0_SELLER_PUBLIC;
const evidencePath = "agent-state/x402-vercel-evidence.json";

if (!buyerSecret || !sellerPublic) {
  console.error("The local buyer secret or x402 seller public key is missing.");
  process.exit(1);
}

async function accountUsdcBalance(publicKey) {
  const response = await fetch(`${horizonUrl}/accounts/${publicKey}`);
  if (!response.ok) return null;
  const account = await response.json();
  const balance = account.balances?.find(item => item.asset_code === "USDC");
  return balance?.balance ?? "0";
}

async function horizonTransaction(transactionHash) {
  const response = await fetch(`${horizonUrl}/transactions/${transactionHash}`);
  if (!response.ok) return null;
  const transaction = await response.json();
  return {
    hash: transaction.hash,
    successful: transaction.successful,
    ledger: transaction.ledger,
    createdAt: transaction.created_at,
    sourceAccount: transaction.source_account,
    feeCharged: transaction.fee_charged,
    operationCount: transaction.operation_count,
  };
}

async function main() {
  const signer = createEd25519Signer(buyerSecret, network);
  const client = new x402Client().register(
    "stellar:*",
    new ExactStellarScheme(signer, { url: rpcUrl }),
  );
  const httpClient = new x402HTTPClient(client);

  const buyerBefore = await accountUsdcBalance(signer.address);
  const sellerBefore = await accountUsdcBalance(sellerPublic);

  const firstTry = await fetch(targetUrl);
  const firstBody = await firstTry.text();
  if (firstTry.status !== 402) {
    throw new Error(`Expected a 402 quote from Vercel, received ${firstTry.status}: ${firstBody.slice(0, 300)}`);
  }

  const paymentRequired = httpClient.getPaymentRequiredResponse(name => firstTry.headers.get(name));
  const selected = paymentRequired.accepts?.[0];
  if (!selected) throw new Error("The Vercel 402 response did not include payment requirements.");
  if (selected.network !== network) throw new Error(`Unexpected network: ${selected.network}`);
  if (selected.payTo !== sellerPublic) throw new Error("The quoted Vercel payee does not match the configured seller.");

  let paymentPayload = await client.createPaymentPayload(paymentRequired);
  const networkPassphrase = getNetworkPassphrase(network);
  const transaction = new Transaction(paymentPayload.payload.transaction, networkPassphrase);
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

  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
  const paidResponse = await fetch(targetUrl, { method: "GET", headers: paymentHeaders });
  const paidBody = await paidResponse.text();
  if (paidResponse.status !== 200) {
    throw new Error(`Vercel paid retry failed with ${paidResponse.status}: ${paidBody.slice(0, 500)}`);
  }

  const settlement = httpClient.getPaymentSettleResponse(name => paidResponse.headers.get(name));
  const transactionHash = settlement?.transaction ?? settlement?.transactionHash;
  if (!transactionHash) throw new Error("The Vercel settlement response did not include a transaction hash.");
  const onChain = await horizonTransaction(transactionHash);
  if (!onChain?.successful) throw new Error("Horizon did not report the Vercel settlement as successful.");

  await new Promise(resolve => setTimeout(resolve, 3000));
  const buyerAfter = await accountUsdcBalance(signer.address);
  const sellerAfter = await accountUsdcBalance(sellerPublic);

  const evidence = {
    status: "confirmed",
    checkedAt: new Date().toISOString(),
    route: targetUrl,
    x402Version: paymentRequired.x402Version,
    resource: paymentRequired.resource,
    requirements: {
      scheme: selected.scheme,
      network: selected.network,
      amount: selected.amount ?? null,
      asset: selected.asset ?? null,
      payTo: selected.payTo ?? null,
      maxTimeoutSeconds: selected.maxTimeoutSeconds ?? null,
      extra: selected.extra ?? null,
    },
    buyer: signer.address,
    payee: sellerPublic,
    facilitator: process.env.X402_FACILITATOR_URL ?? "https://www.x402.org/facilitator",
    transactionHash,
    onChain,
    settlement,
    balances: {
      buyerBefore,
      buyerAfter,
      sellerBefore,
      sellerAfter,
    },
    response: JSON.parse(paidBody),
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");

  console.log("Vercel x402 seller settlement confirmed.");
  console.log(`Transaction: ${transactionHash}`);
  console.log(`Ledger: ${onChain.ledger} | Successful: ${onChain.successful}`);
  console.log(`Buyer USDC: ${buyerBefore} -> ${buyerAfter}`);
  console.log(`Seller USDC: ${sellerBefore} -> ${sellerAfter}`);
  console.log(`Evidence written to ${evidencePath}`);
}

main().catch(error => {
  console.error("Vercel x402 buyer failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
