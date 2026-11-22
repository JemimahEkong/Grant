import fs from "node:fs";
import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const horizonUrl = "https://horizon-testnet.stellar.org";
const friendbotUrl = "https://friendbot.stellar.org";
const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const usdcAsset = new Asset("USDC", usdcIssuer);
const server = new Horizon.Server(horizonUrl);
const envPath = ".env.local";

function readEnv() {
  if (!fs.existsSync(envPath)) return new Map();
  const entries = new Map();
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

function writeEnv(entries) {
  fs.writeFileSync(envPath, [...entries.entries()].map(([key, value]) => `${key}=${value}`).join("\n") + "\n", {
    mode: 0o600,
  });
}

async function accountExists(publicKey) {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch (error) {
    if (error?.response?.status === 404) return false;
    throw error;
  }
}

async function fundWithFriendbot(publicKey) {
  const response = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Friendbot failed for ${publicKey}: ${response.status} ${body.slice(0, 200)}`);
  }
}

async function ensureTrustline(keypair) {
  const account = await server.loadAccount(keypair.publicKey());
  const hasTrustline = account.balances.some(
    balance => "asset_code" in balance && balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  );
  if (hasTrustline) return false;
  const transaction = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset, limit: "10000" }))
    .setTimeout(60)
    .build();
  transaction.sign(keypair);
  await server.submitTransaction(transaction);
  await new Promise(resolve => setTimeout(resolve, 1500));
  return true;
}

async function usdcBalance(publicKey) {
  const account = await server.loadAccount(publicKey);
  return account.balances.find(
    balance => "asset_code" in balance && balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  )?.balance ?? "0";
}

async function ensureUsdc(keypair, amount) {
  const current = Number(await usdcBalance(keypair.publicKey()));
  if (current >= Number(amount)) return null;
  const env = readEnv();
  const treasurySecret = env.get("FAUCET_TREASURY_SECRET") ?? process.env.FAUCET_TREASURY_SECRET;
  if (!treasurySecret) throw new Error("FAUCET_TREASURY_SECRET is not configured.");
  const treasury = Keypair.fromSecret(treasurySecret);
  const account = await server.loadAccount(treasury.publicKey());
  const transaction = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: keypair.publicKey(),
        asset: usdcAsset,
        amount: String(amount),
      }),
    )
    .setTimeout(60)
    .build();
  transaction.sign(treasury);
  const result = await server.submitTransaction(transaction);
  await new Promise(resolve => setTimeout(resolve, 1500));
  return result.hash;
}

function keypairFor(entries, secretName, publicName) {
  const existing = entries.get(secretName);
  const keypair = existing ? Keypair.fromSecret(existing) : Keypair.random();
  entries.set(secretName, keypair.secret());
  entries.set(publicName, keypair.publicKey());
  return keypair;
}

async function main() {
  const entries = readEnv();
  const seller = keypairFor(entries, "MARKET_SELLER_SECRET", "MARKET_SELLER_PUBLIC");
  const buyer = keypairFor(entries, "AGENT_BUYER_SECRET", "AGENT_BUYER_PUBLIC");
  const treasurySecret = entries.get("FAUCET_TREASURY_SECRET") ?? process.env.FAUCET_TREASURY_SECRET;
  if (!treasurySecret) throw new Error("FAUCET_TREASURY_SECRET is not configured.");
  const treasury = Keypair.fromSecret(treasurySecret);
  const existingSeller = entries.get("X402_SELLER_PUBLIC");

  const distinct = new Set([treasury.publicKey(), buyer.publicKey()]);
  if (existingSeller) distinct.add(existingSeller);
  if (distinct.has(seller.publicKey())) {
    throw new Error("The market seller must be distinct from the treasury, the existing seller, and the agent buyer.");
  }
  if (buyer.publicKey() === treasury.publicKey() || buyer.publicKey() === seller.publicKey()) {
    throw new Error("The agent buyer must be distinct from the treasury and the market seller.");
  }

  for (const [label, keypair] of [["seller", seller], ["buyer", buyer]]) {
    if (!(await accountExists(keypair.publicKey()))) {
      await fundWithFriendbot(keypair.publicKey());
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    await ensureTrustline(keypair);
    console.log(`${label}: ${keypair.publicKey()} activated and trustline ready`);
  }

  const fundingHash = await ensureUsdc(buyer, "3");
  entries.set("MARKET_SELLER_SECRET", seller.secret());
  entries.set("MARKET_SELLER_PUBLIC", seller.publicKey());
  entries.set("AGENT_BUYER_SECRET", buyer.secret());
  entries.set("AGENT_BUYER_PUBLIC", buyer.publicKey());
  writeEnv(entries);

  console.log(`seller public: ${seller.publicKey()}`);
  console.log(`buyer public: ${buyer.publicKey()}`);
  console.log(`seller USDC: ${await usdcBalance(seller.publicKey())}`);
  console.log(`buyer USDC: ${await usdcBalance(buyer.publicKey())}`);
  console.log(`buyer funding: ${fundingHash ?? "already funded"}`);
  console.log("Secrets were written to .env.local only and were not printed.");
}

main().catch(error => {
  console.error("Market account setup failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
