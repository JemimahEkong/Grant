import fs from "node:fs";
import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const horizonUrl = "https://horizon-testnet.stellar.org";
const friendbotUrl = "https://friendbot.stellar.org";
const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const usdcAsset = new Asset("USDC", usdcIssuer);
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

function ensureKeypair(entries, secretName, publicName) {
  const existingSecret = entries.get(secretName);
  if (existingSecret) {
    const keypair = Keypair.fromSecret(existingSecret);
    entries.set(publicName, keypair.publicKey());
    return keypair;
  }
  const keypair = Keypair.random();
  entries.set(secretName, keypair.secret());
  entries.set(publicName, keypair.publicKey());
  return keypair;
}

async function accountExists(publicKey) {
  try {
    await new Horizon.Server(horizonUrl).loadAccount(publicKey);
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
  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(keypair.publicKey());
  const hasTrustline = account.balances.some(
    balance => balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
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
  return true;
}

async function describe(keypair) {
  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(keypair.publicKey());
  const xlm = account.balances.find(balance => balance.asset_type === "native");
  const usdc = account.balances.find(
    balance => balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  );
  return {
    publicKey: keypair.publicKey(),
    xlm: xlm?.balance ?? "0",
    usdc: usdc?.balance ?? "0",
    trustline: Boolean(usdc),
  };
}

async function main() {
  const entries = readEnv();
  const buyer = ensureKeypair(entries, "G0_BUYER_SECRET", "G0_BUYER_PUBLIC");
  const seller = ensureKeypair(entries, "G0_SELLER_SECRET", "G0_SELLER_PUBLIC");
  entries.set("G0_FACILITATOR_URL", entries.get("G0_FACILITATOR_URL") ?? "https://www.x402.org/facilitator");
  entries.set("STELLAR_RPC_URL", entries.get("STELLAR_RPC_URL") ?? "https://soroban-testnet.stellar.org");
  writeEnv(entries);

  for (const [label, keypair] of [["buyer", buyer], ["seller", seller]]) {
    if (!(await accountExists(keypair.publicKey()))) {
      process.stdout.write(`Funding ${label} account with testnet XLM... `);
      await fundWithFriendbot(keypair.publicKey());
      console.log("done.");
    }
    const created = await ensureTrustline(keypair);
    console.log(`${label} trustline ${created ? "created" : "already present"}.`);
  }

  console.log("\nG0 accounts:");
  for (const [label, keypair] of [["buyer", buyer], ["seller", seller]]) {
    const state = await describe(keypair);
    console.log(
      `${label}: ${state.publicKey} | XLM ${state.xlm} | USDC ${state.usdc} | trustline ${state.trustline}`,
    );
  }
  console.log("\nSecrets were written only to ignored .env.local and were not printed.");
  console.log("Fund the buyer with testnet USDC from https://faucet.circle.com (network: Stellar Testnet).");
}

main().catch(error => {
  console.error("G0 setup failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
