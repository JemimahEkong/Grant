import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Horizon } from "@stellar/stellar-sdk";

const root = process.cwd();
const sellerUrl = "https://grant-seller.vercel.app";
const buyerPublic = process.env.AGENT_BUYER_PUBLIC;
const sellerPublic = process.env.MARKET_SELLER_PUBLIC;
const force = process.argv.includes("--force");
const budget = "20000000";
const maxPrice = "10000000";
const statePath = path.join(root, "agent-runs", "demo-agent-state.json");
const tenMinutes = 10 * 60 * 1000;
const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

function fail(message) {
  console.log(message);
  process.exit(1);
}

if (!buyerPublic || !sellerPublic) {
  fail("DEMO AGENT FAIL\nAGENT_BUYER_PUBLIC and MARKET_SELLER_PUBLIC are required in .env.local.");
}

if (!force && fs.existsSync(statePath)) {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const elapsed = Date.now() - Date.parse(state.lastRunAt);
    if (Number.isFinite(elapsed) && elapsed < tenMinutes) {
      fail(
        [
          "DEMO AGENT REFUSED",
          `Last run started ${Math.round(elapsed / 1000)} seconds ago.`,
          "Run twice only with --force. The second run must show no second payment.",
        ].join("\n"),
      );
    }
  } catch {
    // A malformed state file does not block a run.
  }
}

fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, JSON.stringify({ lastRunAt: new Date().toISOString() }) + "\n");

async function usdcBalance(publicKey) {
  const account = await horizon.loadAccount(publicKey);
  const balance = account.balances.find(
    item =>
      "asset_code" in item &&
      item.asset_code === "USDC" &&
      item.asset_issuer === usdcIssuer,
  );
  return balance && "balance" in balance ? balance.balance : "0.0000000";
}

async function balances() {
  return {
    buyer: await usdcBalance(buyerPublic),
    seller: await usdcBalance(sellerPublic),
  };
}

function runAgent(briefFile, priceCeiling) {
  const args = [
    "--env-file-if-exists=.env.local",
    "--import",
    "tsx",
    "scripts/agent/buy.ts",
    "--brief",
    briefFile,
    "--budget",
    budget,
    "--max-price",
    priceCeiling,
    "--sellers",
    sellerUrl,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const decisions = [];
  for (const line of (result.stdout ?? "").split(/\r?\n/)) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") decisions.push(parsed);
    } catch {
      // The agent prints only JSON lines. Ignore anything else.
    }
  }
  return {
    status: result.status,
    decisions,
    summary: [...decisions].reverse().find(item => typeof item.summary === "string") ?? null,
  };
}

function block(number, title, fields, pass, passText, failText) {
  console.log("");
  console.log(`${number}/3  ${title}`);
  for (const [label, value] of fields) {
    console.log(`${label.padEnd(12)}${value}`);
  }
  console.log(`${pass ? "PASS" : "FAIL"}         ${pass ? passText : failText}`);
  return pass;
}

async function refusal(number, title, brief, priceCeiling, expectedCode, expectedSentence) {
  const before = await balances();
  const result = runAgent(brief, priceCeiling);
  const after = await balances();
  const summary = result.summary;
  const challenged = result.decisions.some(item => item.decision === "challenge");
  const pass =
    summary?.summary === "REFUSED" &&
    summary.code === expectedCode &&
    summary.message === expectedSentence &&
    !challenged &&
    before.buyer === after.buyer &&
    before.seller === after.seller;
  return block(
    number,
    title,
    [
      ["code", summary?.code ?? "missing"],
      ["sentence", summary?.message ?? "missing"],
      ["buyer", `${before.buyer} -> ${after.buyer}`],
      ["seller", `${before.seller} -> ${after.seller}`],
    ],
    pass,
    "refused before signing; balances unchanged",
    `expected ${expectedCode}, no challenge, unchanged balances`,
  );
}

async function paid(number) {
  const before = await balances();
  const result = runAgent("scripts/agent/briefs/demo-fit.json", maxPrice);
  const after = await balances();
  const summary = result.summary;
  const boughtDecision = result.decisions.find(item => item.decision === "bought");
  const bought = summary?.summary === "BOUGHT";
  const already = summary?.summary === "ALREADY_BOUGHT";
  const license = summary?.licenseId ?? "missing";
  const settlement = summary?.settlementTransactionHash ?? summary?.transactionHash ?? "missing";
  const ledger = summary?.ledger ?? boughtDecision?.ledger ?? (already ? "unchanged" : "missing");
  const price = summary?.price ?? "1.00 USDC";
  const buyerDelta = Number(after.buyer) - Number(before.buyer);
  const sellerDelta = Number(after.seller) - Number(before.seller);
  const pass = bought
    ? summary.licenseId &&
      summary.settlementTransactionHash &&
      ledger !== "missing" &&
      buyerDelta === -1 &&
      sellerDelta === 1
    : already &&
      summary.licenseId &&
      settlement !== "missing" &&
      before.buyer === after.buyer &&
      before.seller === after.seller;
  return block(
    number,
    "PAID RUN",
    [
      ["status", summary?.summary ?? "missing"],
      ["license", license],
      ["price", price],
      ["buyer", `${before.buyer} -> ${after.buyer}`],
      ["seller", `${before.seller} -> ${after.seller}`],
      ["settlement", settlement],
      ["ledger", ledger],
    ],
    Boolean(pass),
    bought ? "paid once; license and settlement returned" : "already bought; no second payment",
    "expected one payment or the already-bought guard, with matching balances",
  );
}

const results = [];
results.push(
  await refusal(
    1,
    "PAID-ADS REFUSAL",
    "scripts/agent/briefs/paid-ads-refusal.json",
    maxPrice,
    "PAID_ADS_NOT_OFFERED",
    "The brief asks for paid ads, and this track does not offer them.",
  ),
);
results.push(
  await refusal(
    2,
    "PRICE REFUSAL",
    "scripts/agent/briefs/max-price.json",
    "5000000",
    "PRICE_ABOVE_MAX",
    "The price 1.00 USDC is above the max price 0.50 USDC.",
  ),
);
results.push(await paid(3));

const passed = results.filter(Boolean).length;
console.log("");
console.log(`SUMMARY      ${passed}/3 PASS`);
if (passed !== 3) process.exitCode = 1;
