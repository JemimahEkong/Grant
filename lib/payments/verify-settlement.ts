const horizonUrl = process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export type HorizonTransaction = {
  hash: string;
  successful: boolean;
  ledger: number;
  createdAt: string;
  sourceAccount: string;
  feeCharged: string;
  operationCount: number;
};

export async function getHorizonTransaction(transactionHash: string): Promise<HorizonTransaction | null> {
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

export async function getUsdcBalance(publicKey: string): Promise<string> {
  const response = await fetch(`${horizonUrl}/accounts/${publicKey}`);
  if (!response.ok) throw new Error("Could not load the Stellar account balance.");
  const account = await response.json();
  const balance = account.balances?.find((item: { asset_code?: string }) => item.asset_code === "USDC");
  return balance?.balance ?? "0";
}

export function usdcToBaseUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole || "0") * 10_000_000n + BigInt((fraction + "0000000").slice(0, 7));
}

export async function verifyTransferDelta(input: {
  buyerPublicKey: string;
  sellerPublicKey: string;
  amountBaseUnits: bigint;
  buyerBefore: string;
  sellerBefore: string;
}): Promise<{
  verified: boolean;
  buyerAfter: string;
  sellerAfter: string;
  buyerSpentBaseUnits: string;
  sellerReceivedBaseUnits: string;
}> {
  const [buyerAfter, sellerAfter] = await Promise.all([
    getUsdcBalance(input.buyerPublicKey),
    getUsdcBalance(input.sellerPublicKey),
  ]);
  const buyerSpent = usdcToBaseUnits(input.buyerBefore) - usdcToBaseUnits(buyerAfter);
  const sellerReceived = usdcToBaseUnits(sellerAfter) - usdcToBaseUnits(input.sellerBefore);
  return {
    verified: buyerSpent >= input.amountBaseUnits && sellerReceived >= input.amountBaseUnits,
    buyerAfter,
    sellerAfter,
    buyerSpentBaseUnits: buyerSpent.toString(),
    sellerReceivedBaseUnits: sellerReceived.toString(),
  };
}
