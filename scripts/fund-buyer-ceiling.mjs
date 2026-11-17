import fs from "node:fs";
import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const horizonUrl = "https://horizon-testnet.stellar.org";
const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const targetBaseUnits = 6_000_0000n;
const outputPath = "agent-state/buyer-ceiling.json";

function parseUsdc(value) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole || "0") * 10_000_000n + BigInt((fraction + "0000000").slice(0, 7));
}

function formatUsdc(baseUnits) {
  return `${baseUnits / 10_000_000n}.${(baseUnits % 10_000_000n).toString().padStart(7, "0")}`;
}

async function main() {
  const secret = process.env.G0_BUYER_SECRET;
  const seller = process.env.G0_SELLER_PUBLIC;
  if (!secret || !seller) throw new Error("Buyer ceiling configuration is incomplete.");

  const buyer = Keypair.fromSecret(secret);
  const server = new Horizon.Server(horizonUrl);
  const account = await server.loadAccount(buyer.publicKey());
  const usdc = account.balances.find(
    balance => balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  );
  if (!usdc) throw new Error("The buyer has no USDC trustline.");

  const current = parseUsdc(usdc.balance);
  if (current < targetBaseUnits) {
    throw new Error(`The buyer holds less than the 6 USDC ceiling: ${usdc.balance}.`);
  }

  const excess = current - targetBaseUnits;
  if (excess > 0n) {
    const transaction = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: seller,
          asset: new Asset("USDC", usdcIssuer),
          amount: formatUsdc(excess),
        }),
      )
      .setTimeout(60)
      .build();
    transaction.sign(buyer);
    await server.submitTransaction(transaction);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const updated = await server.loadAccount(buyer.publicKey());
  const updatedUsdc = updated.balances.find(
    balance => balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  );
  if (!updatedUsdc || parseUsdc(updatedUsdc.balance) !== targetBaseUnits) {
    throw new Error(`The buyer balance did not settle at exactly 6 USDC: ${updatedUsdc?.balance ?? "missing"}.`);
  }

  const record = {
    address: buyer.publicKey(),
    balance: updatedUsdc.balance,
    asset: "USDC",
    network: "stellar:testnet",
    checkedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outputPath, JSON.stringify(record, null, 2) + "\n");
  console.log(`Buyer address: ${record.address}`);
  console.log(`Buyer USDC balance: ${record.balance}`);
  console.log(`Record written to ${outputPath}. The secret was not printed.`);
}

main().catch(error => {
  console.error("Buyer ceiling failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
