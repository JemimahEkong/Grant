import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Horizon, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import type { PaymentRequired } from "@x402/core/types";
import { z } from "zod";
import {
  MARKET_TERMS_EXTENSION_KEY,
  marketOfferListSchema,
  marketTermsSchema,
  type MarketOffer,
} from "../../lib/agent-market/terms";
import {
  canonical,
  challengeTermsRefusal,
  coverageRefusals,
  priceRefusal,
} from "../../lib/agent-market/coverage";

const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const network = "stellar:testnet";
const rpcUrl = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const networkPassphrase = "Test SDF Network ; September 2015";

const briefSchema = z.strictObject({
  platforms: z.array(z.enum(["instagram", "facebook", "tiktok", "youtube"])).min(1).max(4),
  termDays: z.number().int().min(1).max(3650),
  territory: z.strictObject({
    worldwide: z.boolean(),
    countries: z.array(z.string().length(2)).max(249),
  }),
  paidAds: z.boolean(),
  clientDelivery: z.boolean(),
  reposting: z.boolean().default(false),
  futureCampaigns: z.boolean().default(false),
  clipSeconds: z.number().int().positive(),
  moods: z.array(z.string()).max(4).default([]),
  energy: z.number().int().min(1).max(5),
  client: z.string().min(1).max(200),
});

type Brief = z.infer<typeof briefSchema>;
type Decision = Record<string, unknown>;

type Candidate = {
  seller: string;
  offer: MarketOffer;
  score: number;
};

type Refusal = {
  code: string;
  message: string;
  seller: string;
  offerId: string;
};

function parseArgs(argv: string[]) {
  const values: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith("--")) continue;
    const key = argument.slice(2);
    const value = argv[index + 1];
    if (value && !value.startsWith("--")) {
      values[key] = value;
      index += 1;
    }
  }
  return values;
}

function formatUsdc(baseUnits: string | bigint): string {
  const value = typeof baseUnits === "bigint" ? baseUnits : BigInt(baseUnits);
  const whole = value / 10_000_000n;
  const fraction = (value % 10_000_000n).toString().padStart(7, "0");
  return `${whole}.${fraction.slice(0, 2)}`;
}

async function usdcBalance(publicKey: string): Promise<string> {
  try {
    const account = await horizon.loadAccount(publicKey);
    const balance = account.balances.find(
      item =>
        "asset_code" in item &&
        item.asset_code === "USDC" &&
        item.asset_issuer === "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
    return balance && "balance" in balance ? balance.balance : "0.0000000";
  } catch {
    return "0.0000000";
  }
}

function saturatingScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scoreCandidate(brief: Brief, offer: MarketOffer, maxPrice: bigint): number {
  const headroom = Math.max(0, offer.durationSeconds - brief.clipSeconds);
  const durationScore = 1 / (1 + headroom);
  const priceScore = saturatingScore(1 - Number(BigInt(offer.priceBaseUnits)) / Number(maxPrice));
  const moodScore = brief.moods.length
    ? brief.moods.filter(mood => offer.moods.includes(mood)).length / brief.moods.length
    : 0;
  const energyScore = 1 - Math.abs(offer.energy - brief.energy) / 4;
  return 1 * 0.35 + durationScore * 0.25 + priceScore * 0.2 + moodScore * 0.1 + energyScore * 0.1;
}

async function createPayment(buyerSecret: string, paymentRequired: PaymentRequired) {
  const signer = createEd25519Signer(buyerSecret, network);
  const client = new x402Client().register("stellar:*", new ExactStellarScheme(signer, { url: rpcUrl }));
  const httpClient = new x402HTTPClient(client);
  let paymentPayload = await client.createPaymentPayload(paymentRequired);
  const transaction = new Transaction(paymentPayload.payload.transaction as string, networkPassphrase);
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
  return {
    signer,
    httpClient,
    paymentPayload,
    headers: httpClient.encodePaymentSignatureHeader(paymentPayload),
  };
}

async function main() {
  const startedAt = new Date();
  const args = parseArgs(process.argv.slice(2));
  const briefPath = args.brief;
  const budgetText = args.budget;
  const maxPriceText = args["max-price"];
  const sellersText = args.sellers;

  const decisions: Decision[] = [];
  const record = (decision: Decision) => {
    decisions.push(decision);
    console.log(JSON.stringify(decision));
  };

  if (!budgetText || !maxPriceText) {
    record({
      decision: "refused",
      code: "BUDGET_AND_MAX_PRICE_REQUIRED",
      message: "The agent will not spend without both --budget and --max-price.",
    });
    process.exitCode = 1;
    return;
  }
  if (!briefPath || !sellersText) {
    record({ decision: "refused", code: "MISSING_INPUT", message: "Pass --brief and --sellers." });
    process.exitCode = 1;
    return;
  }

  let budget: bigint;
  let maxPrice: bigint;
  try {
    budget = BigInt(budgetText);
    maxPrice = BigInt(maxPriceText);
    if (budget <= 0n || maxPrice <= 0n) throw new Error("not positive");
  } catch {
    record({ decision: "refused", code: "INVALID_PRICE", message: "Budget and max price must be positive base-unit integers." });
    process.exitCode = 1;
    return;
  }

  const brief = briefSchema.parse(JSON.parse(fs.readFileSync(briefPath, "utf8")));
  const sellers = sellersText
    .split(",")
    .map(value => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const briefHash = crypto.createHash("sha256").update(JSON.stringify(brief)).digest("hex");
  const runName = `${startedAt.toISOString().replace(/[:.]/g, "-")}-${briefHash.slice(0, 8)}`;
  const runDir = path.join("agent-runs", runName);
  fs.mkdirSync(runDir, { recursive: true });

  const ledgerPath = path.join("agent-runs", "ledger.json");
  let ledger: { runs: Array<Record<string, unknown>> } = { runs: [] };
  if (fs.existsSync(ledgerPath)) {
    try {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
    } catch {
      ledger = { runs: [] };
    }
  }
  const sellerKey = [...sellers].sort().join(",");
  const existingRun = ledger.runs.find(
    run =>
      run.briefHash === briefHash &&
      run.sellers === sellerKey &&
      run.maxPriceBaseUnits === maxPrice.toString() &&
      run.budgetBaseUnits === budget.toString(),
  );
  if (existingRun) {
    record({
      decision: "refused",
      code: "ALREADY_BOUGHT",
      message: `This brief was already bought in ${existingRun.runFolder}.`,
      licenseId: existingRun.licenseId,
      transactionHash: existingRun.transactionHash,
    });
    console.log(
      JSON.stringify({
        summary: "ALREADY_BOUGHT",
        licenseId: existingRun.licenseId,
        transactionHash: existingRun.transactionHash,
      }),
    );
    return;
  }

  const discovered: Array<{ seller: string; offer: MarketOffer }> = [];
  for (const seller of sellers) {
    try {
      const response = await fetch(`${seller}/api/offers`, { headers: { accept: "application/json" } });
      if (!response.ok) {
        record({ decision: "seller_unavailable", seller, status: response.status });
        continue;
      }
      const parsed = marketOfferListSchema.parse(await response.json());
      for (const offer of parsed.offers) discovered.push({ seller, offer });
      record({ decision: "discovered", seller, offers: parsed.offers.length });
    } catch (error) {
      record({
        decision: "seller_invalid",
        seller,
        message: error instanceof Error ? error.message : "invalid seller response",
      });
    }
  }

  const refusals: Refusal[] = [];
  const candidates: Candidate[] = [];
  for (const { seller, offer } of discovered) {
    const refusalsForOffer = coverageRefusals(brief, offer.terms, offer.durationSeconds);
    if (refusalsForOffer.length > 0) {
      for (const refusal of refusalsForOffer) {
        refusals.push({ ...refusal, seller, offerId: offer.id });
        record({ decision: "refused", code: refusal.code, seller, offerId: offer.id, message: refusal.message });
      }
      continue;
    }
    const price = BigInt(offer.priceBaseUnits);
    const priceIssue = priceRefusal(price, maxPrice, budget);
    if (priceIssue) {
      refusals.push({ ...priceIssue, seller, offerId: offer.id });
      record({ decision: "refused", code: priceIssue.code, seller, offerId: offer.id, message: priceIssue.message });
      continue;
    }
    candidates.push({ seller, offer, score: scoreCandidate(brief, offer, maxPrice) });
  }

  candidates.sort(
    (left, right) =>
      right.score - left.score ||
      Number(BigInt(left.offer.priceBaseUnits) - BigInt(right.offer.priceBaseUnits)) ||
      left.offer.durationSeconds - right.offer.durationSeconds ||
      left.offer.id.localeCompare(right.offer.id),
  );

  if (candidates.length === 0) {
    const closest = [...refusals].sort((left, right) => {
      const priority = (code: string) =>
        code === "PRICE_ABOVE_MAX"
          ? 0
          : code === "PRICE_ABOVE_BUDGET"
            ? 1
            : code === "PAID_ADS_NOT_OFFERED"
              ? 2
              : code === "TERM_TOO_SHORT"
                ? 3
                : code === "PLATFORM_NOT_COVERED"
                  ? 4
                  : 5;
      return priority(left.code) - priority(right.code);
    })[0];
    record({
      decision: "refused",
      code: closest?.code ?? "NO_OFFERS",
      message: closest?.message ?? "No seller returned an offer that fits the brief.",
    });
    fs.writeFileSync(
      path.join(runDir, "decisions.jsonl"),
      decisions.map(decision => JSON.stringify(decision)).join("\n") + "\n",
    );
    console.log(
      JSON.stringify({
        summary: "REFUSED",
        code: closest?.code ?? "NO_OFFERS",
        message: closest?.message ?? "No eligible offer.",
      }),
    );
    process.exitCode = 1;
    return;
  }

  const candidate = candidates[0];
  const licenseUrl = `${candidate.seller}/api/offers/${encodeURIComponent(candidate.offer.id)}/license`;
  const firstResponse = await fetch(licenseUrl, { headers: { accept: "application/json" } });
  const firstBody = await firstResponse.json().catch(() => null);
  if (firstResponse.status !== 402) {
    record({
      decision: "refused",
      code: "UNEXPECTED_LICENSE_STATUS",
      message: `Expected 402, received ${firstResponse.status}.`,
    });
    process.exitCode = 1;
    return;
  }

  const buyerSecret = process.env.AGENT_BUYER_SECRET;
  if (!buyerSecret) {
    record({ decision: "refused", code: "BUYER_SECRET_MISSING", message: "AGENT_BUYER_SECRET is not configured." });
    process.exitCode = 1;
    return;
  }

  const signer = createEd25519Signer(buyerSecret, network);
  const client = new x402Client().register("stellar:*", new ExactStellarScheme(signer, { url: rpcUrl }));
  const httpClient = new x402HTTPClient(client);
  const paymentRequired = httpClient.getPaymentRequiredResponse(name => firstResponse.headers.get(name));
  const challengeTerms = marketTermsSchema.safeParse(paymentRequired.extensions?.[MARKET_TERMS_EXTENSION_KEY]);
  record({
    decision: "challenge",
    seller: candidate.seller,
    offerId: candidate.offer.id,
    termsKey: MARKET_TERMS_EXTENSION_KEY,
    termsPresent: challengeTerms.success,
    status: firstResponse.status,
  });
  fs.writeFileSync(
    path.join(runDir, "challenge.json"),
    JSON.stringify({ body: firstBody, paymentRequired }, null, 2) + "\n",
  );

  if (!challengeTerms.success) {
    record({
      decision: "refused",
      code: "TERMS_MISSING_IN_CHALLENGE",
      message: "The 402 challenge did not include the terms extension.",
    });
    process.exitCode = 1;
    return;
  }
  const termsRefusal = challengeTermsRefusal(candidate.offer.terms, challengeTerms.data);
  if (termsRefusal) {
    record({
      decision: "refused",
      code: termsRefusal.code,
      message: termsRefusal.message,
    });
    process.exitCode = 1;
    return;
  }

  const challengeRefusals = coverageRefusals(brief, challengeTerms.data, candidate.offer.durationSeconds);
  if (challengeRefusals.length > 0) {
    record({
      decision: "refused",
      code: challengeRefusals[0].code,
      message: `The challenge terms fail the brief: ${challengeRefusals[0].message}`,
    });
    process.exitCode = 1;
    return;
  }

  const requirement = paymentRequired.accepts?.[0];
  if (!requirement) {
    record({
      decision: "refused",
      code: "PAYMENT_REQUIREMENTS_MISSING",
      message: "The 402 challenge had no payment requirements.",
    });
    process.exitCode = 1;
    return;
  }
  if (
    requirement.network !== network ||
    requirement.payTo !== candidate.offer.payee ||
    requirement.amount !== candidate.offer.priceBaseUnits ||
    requirement.asset !== candidate.offer.asset
  ) {
    record({
      decision: "refused",
      code: "CHALLENGE_PAYMENT_MISMATCH",
      message: "The payment requirements do not match the listing offer.",
    });
    process.exitCode = 1;
    return;
  }

  const buyerBefore = await usdcBalance(signer.address);
  const sellerBefore = await usdcBalance(candidate.offer.payee);
  const price = BigInt(candidate.offer.priceBaseUnits);
  if (BigInt(Math.round(Number(buyerBefore) * 10_000_000)) < price) {
    record({
      decision: "refused",
      code: "INSUFFICIENT_BUYER_BALANCE",
      message: `The buyer balance ${buyerBefore} is below the price ${formatUsdc(price)}.`,
    });
    process.exitCode = 1;
    return;
  }

  const prepared = await createPayment(buyerSecret, paymentRequired);
  const paymentHeader =
    Object.entries(prepared.headers).find(([key]) => {
      const lower = key.toLowerCase();
      return lower === "payment-signature" || lower === "x-payment";
    })?.[1] ?? "";
  fs.writeFileSync(path.join(runDir, "payment-signature.txt"), paymentHeader, { mode: 0o600 });
  const paidResponse = await fetch(licenseUrl, {
    headers: { ...prepared.headers, accept: "application/json" },
  });
  const paidBody = await paidResponse.json().catch(() => null);
  if (paidResponse.status !== 200) {
    record({
      decision: paidResponse.status >= 500 ? "pending" : "refused",
      code: "PAYMENT_FAILED",
      message: `The paid request returned ${paidResponse.status}. No retry was attempted.`,
    });
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(
    path.join(runDir, "paid-response.json"),
    JSON.stringify(
      { status: paidResponse.status, headers: Object.fromEntries(paidResponse.headers.entries()), body: paidBody },
      null,
      2,
    ) + "\n",
  );
  const settlement = (() => {
    try {
      return prepared.httpClient.getPaymentSettleResponse(name => paidResponse.headers.get(name));
    } catch {
      return null;
    }
  })();
  const license = paidBody?.license;
  const authorizationTransactionHash = Buffer.from(
    new Transaction(prepared.paymentPayload.payload.transaction as string, networkPassphrase).hash(),
  ).toString("hex");
  const settlementTransactionHash = settlement?.transaction ?? null;
  if (!license || !settlementTransactionHash) {
    record({
      decision: "pending",
      code: "LICENSE_UNVERIFIED",
      message: "The response had no license or transaction hash. No retry was attempted.",
    });
    process.exitCode = 1;
    return;
  }
  if (
    license.transactionHash !== authorizationTransactionHash ||
    (license.settlementTransactionHash && license.settlementTransactionHash !== settlementTransactionHash) ||
    settlement?.payer !== signer.address ||
    license.payee !== candidate.offer.payee ||
    license.amountBaseUnits !== candidate.offer.priceBaseUnits ||
    license.asset !== candidate.offer.asset ||
    license.network !== network ||
    canonical(license.terms) !== canonical(challengeTerms.data)
  ) {
    record({
      decision: "pending",
      code: "LICENSE_MISMATCH",
      message: "The license did not match the offer and challenge terms.",
    });
    process.exitCode = 1;
    return;
  }

  const transaction = await fetch(`https://horizon-testnet.stellar.org/transactions/${settlementTransactionHash}`)
    .then(response => (response.ok ? response.json() : null))
    .catch(() => null);
  if (!transaction?.successful) {
    record({
      decision: "pending",
      code: "SETTLEMENT_UNVERIFIED",
      message: "Horizon did not confirm the transaction. No retry was attempted.",
    });
    process.exitCode = 1;
    return;
  }

  const audioResponse = await fetch(paidBody.downloadUrl);
  if (!audioResponse.ok) {
    record({ decision: "pending", code: "DOWNLOAD_FAILED", message: `The download returned ${audioResponse.status}.` });
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(path.join(runDir, "audio.mp3"), Buffer.from(await audioResponse.arrayBuffer()));
  fs.writeFileSync(path.join(runDir, "license.json"), JSON.stringify(paidBody, null, 2) + "\n");
  fs.writeFileSync(
    path.join(runDir, "decisions.jsonl"),
    decisions.map(decision => JSON.stringify(decision)).join("\n") + "\n",
  );

  await new Promise(resolve => setTimeout(resolve, 2500));
  const buyerAfter = await usdcBalance(signer.address);
  const sellerAfter = await usdcBalance(candidate.offer.payee);
  const receipt = {
    buyer: signer.address,
    seller: candidate.seller,
    offerId: candidate.offer.id,
    title: candidate.offer.title,
    priceBaseUnits: candidate.offer.priceBaseUnits,
    licenseId: license.id,
    authorizationTransactionHash,
    settlementTransactionHash,
    transactionHash: settlementTransactionHash,
    licenseTransactionHash: license.transactionHash,
    ledger: transaction.ledger,
    issuedAt: license.issuedAt,
    buyerBefore,
    buyerAfter,
    sellerBefore,
    sellerAfter,
    settlement,
    challengeTerms: challengeTerms.data,
    proofUrl: paidBody.proofUrl,
  };
  fs.writeFileSync(path.join(runDir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  ledger.runs.push({
    briefHash,
    sellers: sellerKey,
    seller: candidate.seller,
    offerId: candidate.offer.id,
    licenseId: license.id,
    authorizationTransactionHash,
    settlementTransactionHash,
    transactionHash: settlementTransactionHash,
    maxPriceBaseUnits: maxPrice.toString(),
    budgetBaseUnits: budget.toString(),
    runFolder: runDir,
    createdAt: new Date().toISOString(),
  });
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
  record({
    decision: "bought",
    licenseId: license.id,
    authorizationTransactionHash,
    settlementTransactionHash,
    ledger: transaction.ledger,
    priceBaseUnits: candidate.offer.priceBaseUnits,
  });

  console.log(
    JSON.stringify({
      summary: "BOUGHT",
      title: candidate.offer.title,
      seller: candidate.seller,
      price: `${formatUsdc(price)} USDC`,
      licenseId: license.id,
      authorizationTransactionHash,
      settlementTransactionHash,
      buyer: `${buyerBefore} -> ${buyerAfter}`,
      sellerBalance: `${sellerBefore} -> ${sellerAfter}`,
      run: runDir,
    }),
  );
}

main().catch(error => {
  console.error(
    JSON.stringify({
      decision: "pending",
      code: "AGENT_STOPPED",
      message: error instanceof Error ? error.message : "unknown error",
      note: "No retry was attempted.",
    }),
  );
  process.exitCode = 1;
});
