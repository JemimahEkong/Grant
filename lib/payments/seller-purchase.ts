import { and, eq } from "drizzle-orm";
import type { GrantDatabase } from "../db/client";
import { RepositoryError } from "../db/errors";
import { paymentAttempts, purchases, type PaymentAttemptRow, type PurchaseRow } from "../db/schema";
import { verifyAttemptToken } from "./attempt-token";

export type SellerPurchase = {
  purchase: PurchaseRow;
  attempt: PaymentAttemptRow;
  token: ReturnType<typeof verifyAttemptToken>;
};

export async function loadSellerPurchase(
  db: GrantDatabase,
  token: string,
  now = new Date(),
): Promise<SellerPurchase> {
  const payload = verifyAttemptToken(token, now);
  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, payload.purchaseId)).limit(1);
  if (!purchase) {
    throw new RepositoryError("PURCHASE_NOT_FOUND", "The purchase was not found.", 404);
  }
  if (purchase.status !== "reserved" && purchase.status !== "payment_pending") {
    throw new RepositoryError("PURCHASE_NOT_PAYABLE", "The purchase is not in a payable state.", 409);
  }
  if (
    purchase.priceBaseUnits.toString() !== payload.priceBaseUnits ||
    purchase.network !== payload.network ||
    purchase.assetContractId !== payload.assetContractId ||
    purchase.payeeAddress !== payload.payeeAddress
  ) {
    throw new RepositoryError("ATTEMPT_TOKEN_MISMATCH", "The attempt token does not match the purchase.", 409);
  }
  if (!purchase.payeeAddress) {
    throw new RepositoryError("PAYEE_NOT_CONFIGURED", "The purchase has no seller payee.", 422);
  }
  const [attempt] = await db
    .select()
    .from(paymentAttempts)
    .where(and(eq(paymentAttempts.id, payload.attemptId), eq(paymentAttempts.purchaseId, purchase.id)))
    .limit(1);
  if (!attempt) {
    throw new RepositoryError("ATTEMPT_NOT_FOUND", "The payment attempt was not found.", 404);
  }
  if (attempt.phase !== "signing_started" && attempt.phase !== "submitted" && attempt.phase !== "uncertain") {
    throw new RepositoryError("ATTEMPT_NOT_SIGNING", "The attempt is not ready for payment.", 409);
  }
  return { purchase, attempt, token: payload };
}
