import fs from "node:fs";
import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const horizonUrl = "https://horizon-testnet.stellar.org";
const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const usdcAsset = new Asset("USDC", usdcIssuer);
const server = new Horizon.Server(horizonUrl);
const envPath = ".env.local";

function readEnvFile() {
  const values = new Map();
  if (!fs.existsSync(envPath)) return values;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

function writeEnvFile(values) {
  fs.writeFileSync(
    envPath,
    [...values.entries()].map(([key, value]) => `${key}=${value}`).join("\n") + "\n",
    { mode: 0o600 },
  );
}

async function main() {
  const fileEnv = readEnvFile();
  const treasurySecret = process.env.FAUCET_TREASURY_SECRET ?? fileEnv.get("FAUCET_TREASURY_SECRET");
  if (!treasurySecret) throw new Error("FAUCET_TREASURY_SECRET is not configured.");
  const treasury = Keypair.fromSecret(treasurySecret);

  const existingSecret = process.env.X402_SELLER_SECRET ?? fileEnv.get("X402_SELLER_SECRET");
  const seller = existingSecret ? Keypair.fromSecret(existingSecret) : Keypair.random();
  if (seller.publicKey() === treasury.publicKey()) {
    throw new Error("The seller account must be distinct from the faucet treasury.");
  }

  let account = null;
  try {
    account = await server.loadAccount(seller.publicKey());
  } catch (error) {
    const status = error?.response?.status;
    if (status !== 404) throw error;
  }

  let activationHash = null;
  if (!account) {
    const treasuryAccount = await server.loadAccount(treasury.publicKey());
    const transaction = new TransactionBuilder(treasuryAccount, {
      fee: "100000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.createAccount({
          destination: seller.publicKey(),
          startingBalance: process.env.WALLET_MIN_XLM ?? "3",
        }),
      )
      .setTimeout(60)
      .build();
    transaction.sign(treasury);
    const result = await server.submitTransaction(transaction);
    activationHash = result.hash;
    await new Promise(resolve => setTimeout(resolve, 1500));
    account = await server.loadAccount(seller.publicKey());
  }

  let trustlineHash = null;
  const hasTrustline = account.balances.some(
    balance => "asset_code" in balance && balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  );
  if (!hasTrustline) {
    const transaction = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: usdcAsset, limit: "10000" }))
      .setTimeout(60)
      .build();
    transaction.sign(seller);
    const result = await server.submitTransaction(transaction);
    trustlineHash = result.hash;
    await new Promise(resolve => setTimeout(resolve, 1500));
    account = await server.loadAccount(seller.publicKey());
  }

  fileEnv.set("X402_SELLER_PUBLIC", seller.publicKey());
  fileEnv.set("X402_SELLER_SECRET", seller.secret());
  writeEnvFile(fileEnv);

  const xlm = account.balances.find(balance => balance.asset_type === "native")?.balance ?? "0";
  const usdc = account.balances.find(
    balance => "asset_code" in balance && balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  )?.balance ?? "0";

  console.log(`Seller account: ${seller.publicKey()}`);
  console.log(`XLM balance: ${xlm}`);
  console.log(`USDC balance: ${usdc}`);
  console.log(`Activation: ${activationHash ?? "already active"}`);
  console.log(`Trustline: ${trustlineHash ?? "already present"}`);
  console.log(".env.local updated with X402_SELLER_PUBLIC and X402_SELLER_SECRET.");
  console.log("The seller secret was written to the ignored env file and was not printed.");
}

main().catch(error => {
  console.error("Seller account setup failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
