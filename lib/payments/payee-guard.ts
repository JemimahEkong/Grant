import { Keypair } from "@stellar/stellar-sdk";
import { and, eq } from "drizzle-orm";
import type { GrantDatabase } from "../db/client";
import { RepositoryError } from "../db/errors";
import { offers } from "../db/schema";

type Env = Record<string, string | undefined>;

export function treasuryPublicKeyFromEnv(env: Env = process.env): string | null {
  const secret = env.FAUCET_TREASURY_SECRET;
  if (!secret) return null;
  try {
    return Keypair.fromSecret(secret).publicKey();
  } catch {
    throw new RepositoryError(
      "TREASURY_CONFIGURATION_INVALID",
      "FAUCET_TREASURY_SECRET is not a valid Stellar secret.",
      503,
    );
  }
}

export function assertPayeeIsNotTreasury(payeeAddress: string, env: Env = process.env): void {
  const treasury = treasuryPublicKeyFromEnv(env);
  if (treasury && payeeAddress === treasury) {
    throw new RepositoryError(
      "PAYEE_IS_TREASURY",
      "The seller payee is the faucet treasury. Repoint the offer to the dedicated seller account.",
      503,
    );
  }
}

export async function assertActiveOffersDoNotPayTreasury(
  db: GrantDatabase,
  env: Env = process.env,
): Promise<void> {
  const treasury = treasuryPublicKeyFromEnv(env);
  if (!treasury) return;
  const [offer] = await db
    .select({ id: offers.id })
    .from(offers)
    .where(and(eq(offers.active, true), eq(offers.payeeAddress, treasury)))
    .limit(1);
  if (offer) {
    throw new RepositoryError(
      "ACTIVE_OFFER_PAYS_TREASURY",
      `Active offer ${offer.id} pays the faucet treasury. Repoint it to the dedicated seller account.`,
      503,
    );
  }
}
