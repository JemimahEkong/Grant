import { Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { RepositoryError } from "../db/errors";

const horizonUrl = "https://horizon-testnet.stellar.org";
const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const usdcAsset = new Asset("USDC", usdcIssuer);
const server = new Horizon.Server(horizonUrl);

export type WalletBalance = {
  exists: boolean;
  xlm: string;
  usdc: string;
};

export function formatStellarAmount(baseUnits: bigint): string {
  return `${baseUnits / 10_000_000n}.${(baseUnits % 10_000_000n).toString().padStart(7, "0")}`;
}

export function usdcBaseUnits(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole || "0") * 10_000_000n + BigInt((fraction + "0000000").slice(0, 7));
}

export function createWalletKeypair(): { publicKey: string; secret: string } {
  const keypair = Keypair.random();
  return { publicKey: keypair.publicKey(), secret: keypair.secret() };
}

export async function getWalletBalance(publicKey: string): Promise<WalletBalance> {
  try {
    const account = await server.loadAccount(publicKey);
    const xlm = account.balances.find(balance => balance.asset_type === "native");
    const usdc = account.balances.find(
      balance => "asset_code" in balance && balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
    );
    return { exists: true, xlm: xlm?.balance ?? "0.0000000", usdc: usdc?.balance ?? "0.0000000" };
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 404) return { exists: false, xlm: "0.0000000", usdc: "0.0000000" };
    throw new RepositoryError("HORIZON_UNAVAILABLE", "The Stellar testnet is unavailable.", 503);
  }
}

export async function hasUsdcTrustline(publicKey: string): Promise<boolean> {
  const balance = await getWalletBalance(publicKey);
  if (!balance.exists) return false;
  const account = await server.loadAccount(publicKey);
  return account.balances.some(
    balance => "asset_code" in balance && balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  );
}

function treasuryKeypair(): Keypair {
  const secret = process.env.FAUCET_TREASURY_SECRET;
  if (!secret) {
    throw new RepositoryError("FAUCET_NOT_CONFIGURED", "The faucet treasury is not configured.", 503);
  }
  return Keypair.fromSecret(secret);
}

export function getTreasuryPublicKey(): string | null {
  try {
    return treasuryKeypair().publicKey();
  } catch {
    return null;
  }
}

export async function getTreasuryUsdcBalance(): Promise<bigint> {
  const treasury = treasuryKeypair();
  const balance = await getWalletBalance(treasury.publicKey());
  return usdcBaseUnits(balance.usdc);
}

export async function activateWalletOnChain(publicKey: string): Promise<{ created: boolean }> {
  const existing = await getWalletBalance(publicKey);
  if (existing.exists) return { created: false };
  const treasury = treasuryKeypair();
  const account = await server.loadAccount(treasury.publicKey());
  const startingBalance = process.env.WALLET_MIN_XLM ?? "3";
  const transaction = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.createAccount({ destination: publicKey, startingBalance }))
    .setTimeout(60)
    .build();
  transaction.sign(treasury);
  await server.submitTransaction(transaction);
  return { created: true };
}

export async function addUsdcTrustline(secret: string): Promise<{ created: boolean }> {
  const keypair = Keypair.fromSecret(secret);
  const account = await server.loadAccount(keypair.publicKey());
  const existing = account.balances.find(
    balance => "asset_code" in balance && balance.asset_code === "USDC" && balance.asset_issuer === usdcIssuer,
  );
  if (existing) return { created: false };
  const transaction = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset, limit: "10000" }))
    .setTimeout(60)
    .build();
  transaction.sign(keypair);
  await server.submitTransaction(transaction);
  return { created: true };
}

export async function sendUsdcFromTreasury(destination: string, amountBaseUnits: bigint): Promise<string> {
  const treasury = treasuryKeypair();
  const account = await server.loadAccount(treasury.publicKey());
  const transaction = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: usdcAsset,
        amount: formatStellarAmount(amountBaseUnits),
      }),
    )
    .setTimeout(60)
    .build();
  transaction.sign(treasury);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}

export type WalletTransaction = {
  hash: string;
  createdAt: string;
  successful: boolean;
  type: string;
  label: string;
  amount: string | null;
  asset: string | null;
  direction: "in" | "out" | null;
};

export async function getWalletTransactions(publicKey: string): Promise<WalletTransaction[]> {
  const response = await fetch(
    `${horizonUrl}/accounts/${publicKey}/operations?order=desc&limit=12&include_failed=true`,
  );
  if (response.status === 404) return [];
  if (!response.ok) throw new RepositoryError("HORIZON_UNAVAILABLE", "Transaction history is unavailable.", 503);
  const payload = await response.json();
  return (payload._embedded?.records ?? []).map((operation: Record<string, unknown>) => {
    const type = String(operation.type ?? "unknown");
    const destination = typeof operation.to === "string" ? operation.to : null;
    const amount = typeof operation.amount === "string" ? operation.amount : null;
    const assetCode =
      typeof operation.asset_code === "string" ? operation.asset_code : typeof operation.asset_type === "string" && operation.asset_type === "native" ? "XLM" : null;
    let label = "Stellar testnet transaction";
    if (type === "create_account") label = "Account activated";
    else if (type === "change_trust") label = "USDC trustline added";
    else if (type === "payment") label = `${assetCode ?? "Asset"} payment`;
    else if (type === "invoke_host_function") label = "Testnet payment";
    else if (type === "manage_data") label = "Account data";
    return {
      hash: String(operation.transaction_hash ?? ""),
      createdAt: String(operation.created_at ?? ""),
      successful: Boolean(operation.transaction_successful),
      type,
      label,
      amount,
      asset: assetCode,
      direction: destination === publicKey ? "in" : destination ? "out" : null,
    };
  });
}
