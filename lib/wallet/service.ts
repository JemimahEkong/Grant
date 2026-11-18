import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { GrantDatabase } from "../db/client";
import { randomId } from "../db/crypto";
import { RepositoryError } from "../db/errors";
import { faucetGrants, wallets, type FaucetGrantRow, type WalletRow } from "../db/schema";
import { getCachedWalletBalance, invalidateWalletBalance } from "./balance-cache";
import { decryptWalletSecret, encryptWalletSecret } from "./crypto";
import {
  activateWalletOnChain,
  addUsdcTrustline,
  createWalletKeypair,
  getTreasuryPublicKey,
  getTreasuryUsdcBalance,
  getWalletBalance,
  getWalletTransactions,
  sendUsdcFromTreasury,
  usdcBaseUnits,
  type WalletTransaction,
} from "./stellar";

export type WalletStep = "wallet" | "activate" | "trustline" | "fund" | "complete";

export type WalletView = {
  configured: boolean;
  id: string | null;
  address: string | null;
  network: "stellar:testnet";
  status: WalletRow["status"] | null;
  step: WalletStep;
  balance: string;
  xlm: string;
  exists: boolean;
  treasuryAddress: string | null;
  faucetAmountBaseUnits: string;
  dailyCapBaseUnits: string;
  custody: string;
};

export type FaucetOutcome =
  | { outcome: "confirmed"; transactionHash: string; balance: string; grantId: string }
  | { outcome: "already_funded"; transactionHash: string | null; grantId: string }
  | { outcome: "pending"; grantId: string }
  | { outcome: "daily_cap"; grantId: null }
  | { outcome: "treasury_empty"; treasuryAddress: string | null; grantId: null }
  | { outcome: "failed"; grantId: string };

export function faucetAmountBaseUnits(): bigint {
  return BigInt(process.env.FAUCET_GRANT_BASE_UNITS ?? "50000000");
}

export function faucetDailyCapBaseUnits(): bigint {
  return BigInt(process.env.FAUCET_DAILY_CAP_BASE_UNITS ?? "150000000");
}

const custodyDisclosure =
  "Grant holds this testnet key encrypted at rest so the demo can sign for you. It is not a production custodian, not insured, and not a guarantee of legal clearance. Testnet funds only.";

function stepFor(wallet: WalletRow | null, usdc: string): WalletStep {
  if (!wallet) return "wallet";
  if (wallet.status === "created") return "activate";
  if (wallet.status === "activated") return "trustline";
  if (wallet.status === "trustline") return usdcBaseUnits(usdc) > 0n ? "complete" : "fund";
  return "complete";
}

export async function getWalletRow(db: GrantDatabase, ownerId: string): Promise<WalletRow | null> {
  const [row] = await db.select().from(wallets).where(eq(wallets.ownerId, ownerId)).limit(1);
  return row ?? null;
}

export async function getWalletView(
  db: GrantDatabase,
  ownerId: string,
  options: { refresh?: boolean } = {},
): Promise<WalletView> {
  const wallet = await getWalletRow(db, ownerId);
  const treasuryAddress = getTreasuryPublicKey();
  if (!wallet) {
    return {
      configured: false,
      id: null,
      address: null,
      network: "stellar:testnet",
      status: null,
      step: "wallet",
      balance: "0.0000000",
      xlm: "0.0000000",
      exists: false,
      treasuryAddress,
      faucetAmountBaseUnits: faucetAmountBaseUnits().toString(),
      dailyCapBaseUnits: faucetDailyCapBaseUnits().toString(),
      custody: custodyDisclosure,
    };
  }
  const balance = await getCachedWalletBalance(wallet.publicKey, options.refresh);
  return {
    configured: true,
    id: wallet.id,
    address: wallet.publicKey,
    network: "stellar:testnet",
    status: wallet.status,
    step: stepFor(wallet, balance.usdc),
    balance: balance.usdc,
    xlm: balance.xlm,
    exists: balance.exists,
    treasuryAddress,
    faucetAmountBaseUnits: faucetAmountBaseUnits().toString(),
    dailyCapBaseUnits: faucetDailyCapBaseUnits().toString(),
    custody: custodyDisclosure,
  };
}

export async function createWalletForOwner(db: GrantDatabase, ownerId: string): Promise<WalletRow> {
  const existing = await getWalletRow(db, ownerId);
  if (existing) return existing;
  const keypair = createWalletKeypair();
  const encrypted = encryptWalletSecret(keypair.secret);
  try {
    const [wallet] = await db
      .insert(wallets)
      .values({
        id: randomId("wal"),
        ownerId,
        publicKey: keypair.publicKey,
        encryptedSecret: encrypted.encryptedSecret,
        secretIv: encrypted.secretIv,
        network: "stellar:testnet",
        status: "created",
      })
      .returning();
    return wallet;
  } catch (error) {
    const raced = await getWalletRow(db, ownerId);
    if (raced) return raced;
    throw error;
  }
}

export async function activateWalletForOwner(db: GrantDatabase, ownerId: string): Promise<WalletView> {
  const wallet = await getWalletRow(db, ownerId);
  if (!wallet) throw new RepositoryError("WALLET_REQUIRED", "Generate a wallet first.", 409);
  if (wallet.status !== "created" && wallet.status !== "activated") return getWalletView(db, ownerId, { refresh: true });

  const existing = await getWalletBalance(wallet.publicKey);
  if (!existing.exists) {
    await activateWalletOnChain(wallet.publicKey);
  }
  const now = new Date();
  await db
    .update(wallets)
    .set({ status: "activated", activatedAt: wallet.activatedAt ?? now, updatedAt: now })
    .where(eq(wallets.id, wallet.id));
  invalidateWalletBalance(wallet.publicKey);
  return getWalletView(db, ownerId, { refresh: true });
}

export async function addTrustlineForOwner(db: GrantDatabase, ownerId: string): Promise<WalletView> {
  const wallet = await getWalletRow(db, ownerId);
  if (!wallet) throw new RepositoryError("WALLET_REQUIRED", "Generate a wallet first.", 409);
  if (wallet.status === "created") {
    throw new RepositoryError("WALLET_NOT_ACTIVATED", "Activate the account before adding a trustline.", 409);
  }
  if (wallet.status === "funded") return getWalletView(db, ownerId, { refresh: true });

  const secret = decryptWalletSecret(wallet.encryptedSecret, wallet.secretIv);
  await addUsdcTrustline(secret);
  const now = new Date();
  await db
    .update(wallets)
    .set({ status: "trustline", trustlineAt: wallet.trustlineAt ?? now, updatedAt: now })
    .where(eq(wallets.id, wallet.id));
  invalidateWalletBalance(wallet.publicKey);
  return getWalletView(db, ownerId, { refresh: true });
}

function definiteFaucetFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return ["op_underfunded", "op_no_trust", "op_low_reserve", "tx_bad_seq", "tx_insufficient_fee", "op_malformed"].some(
    code => message.includes(code),
  );
}

export async function fundWalletFromFaucet(db: GrantDatabase, ownerId: string): Promise<FaucetOutcome> {
  const wallet = await getWalletRow(db, ownerId);
  if (!wallet) throw new RepositoryError("WALLET_REQUIRED", "Generate a wallet first.", 409);
  if (wallet.status === "created" || wallet.status === "activated") {
    throw new RepositoryError("WALLET_NOT_READY", "Activate the account and add a USDC trustline first.", 409);
  }

  const [existing] = await db
    .select()
    .from(faucetGrants)
    .where(and(eq(faucetGrants.ownerId, ownerId), inArray(faucetGrants.status, ["pending", "confirmed"])))
    .limit(1);
  if (existing?.status === "confirmed") {
    return { outcome: "already_funded", transactionHash: existing.transactionHash, grantId: existing.id };
  }
  if (existing?.status === "pending") return { outcome: "pending", grantId: existing.id };

  const treasuryAddress = getTreasuryPublicKey();
  if (!treasuryAddress) {
    return { outcome: "treasury_empty", treasuryAddress: null, grantId: null };
  }
  const amount = faucetAmountBaseUnits();
  const treasuryBalance = await getTreasuryUsdcBalance();
  if (treasuryBalance < amount) {
    return { outcome: "treasury_empty", treasuryAddress, grantId: null };
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const reservation = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('grant_faucet'))`);
    const [pending] = await tx
      .select()
      .from(faucetGrants)
      .where(and(eq(faucetGrants.ownerId, ownerId), inArray(faucetGrants.status, ["pending", "confirmed"])))
      .limit(1);
    if (pending) return { existing: pending };
    const [totalRow] = await tx
      .select({ total: sql<string>`coalesce(sum(${faucetGrants.amountBaseUnits}), 0)::text` })
      .from(faucetGrants)
      .where(and(inArray(faucetGrants.status, ["pending", "confirmed"]), gte(faucetGrants.createdAt, dayStart)));
    const total = BigInt(totalRow?.total ?? "0");
    if (total + amount > faucetDailyCapBaseUnits()) return { capped: true as const };
    const [grant] = await tx
      .insert(faucetGrants)
      .values({
        id: randomId("fau"),
        ownerId,
        walletId: wallet.id,
        amountBaseUnits: amount,
        status: "pending",
      })
      .returning();
    return { grant };
  });

  if ("existing" in reservation && reservation.existing) {
    const grant = reservation.existing as FaucetGrantRow;
    return grant.status === "confirmed"
      ? { outcome: "already_funded", transactionHash: grant.transactionHash, grantId: grant.id }
      : { outcome: "pending", grantId: grant.id };
  }
  if ("capped" in reservation) return { outcome: "daily_cap", grantId: null };
  const grant = reservation.grant;
  if (!grant) return { outcome: "failed", grantId: "" };

  try {
    const transactionHash = await sendUsdcFromTreasury(wallet.publicKey, amount);
    await db
      .update(faucetGrants)
      .set({ status: "confirmed", transactionHash, updatedAt: new Date() })
      .where(eq(faucetGrants.id, grant.id));
    await db
      .update(wallets)
      .set({ status: "funded", fundedAt: new Date(), updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id));
    invalidateWalletBalance(wallet.publicKey);
    const balance = await getWalletBalance(wallet.publicKey);
    return { outcome: "confirmed", transactionHash, balance: balance.usdc, grantId: grant.id };
  } catch (error) {
    if (definiteFaucetFailure(error)) {
      await db
        .update(faucetGrants)
        .set({ status: "failed", errorCode: "FAUCET_SEND_REJECTED", updatedAt: new Date() })
        .where(eq(faucetGrants.id, grant.id));
      return { outcome: "failed", grantId: grant.id };
    }
    return { outcome: "pending", grantId: grant.id };
  }
}

export async function refreshWalletForOwner(db: GrantDatabase, ownerId: string): Promise<WalletView> {
  const wallet = await getWalletRow(db, ownerId);
  if (!wallet) return getWalletView(db, ownerId, { refresh: true });
  const balance = await getCachedWalletBalance(wallet.publicKey, true);
  if (wallet.status === "trustline" && usdcBaseUnits(balance.usdc) > 0n) {
    await db
      .update(wallets)
      .set({ status: "funded", fundedAt: wallet.fundedAt ?? new Date(), updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id));
  }
  return getWalletView(db, ownerId, { refresh: true });
}

export async function getWalletTransactionsForOwner(db: GrantDatabase, ownerId: string): Promise<WalletTransaction[]> {
  const wallet = await getWalletRow(db, ownerId);
  if (!wallet) return [];
  return getWalletTransactions(wallet.publicKey);
}

export async function requireFundedWallet(db: GrantDatabase, ownerId: string): Promise<{ wallet: WalletRow; balance: string }> {
  const wallet = await getWalletRow(db, ownerId);
  if (!wallet) throw new RepositoryError("WALLET_REQUIRED", "Generate a wallet first.", 409);
  if (wallet.status !== "funded") {
    throw new RepositoryError("WALLET_NOT_FUNDED", "Fund the testnet wallet before paying.", 403);
  }
  const balance = await getCachedWalletBalance(wallet.publicKey);
  if (usdcBaseUnits(balance.usdc) <= 0n) {
    throw new RepositoryError("WALLET_EMPTY", "The testnet wallet has no USDC.", 403);
  }
  return { wallet, balance: balance.usdc };
}

export function decryptOwnerSecret(wallet: WalletRow): string {
  return decryptWalletSecret(wallet.encryptedSecret, wallet.secretIv);
}
