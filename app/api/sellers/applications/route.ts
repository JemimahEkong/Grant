import { z } from "zod";
import { assertSameOrigin } from "../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db/client";
import { RepositoryError } from "../../../../lib/db/errors";
import { consumeRateLimit } from "../../../../lib/db/rate-limit";
import { createSellerApplication } from "../../../../lib/db/repositories";
import { jsonSafe } from "../../../../lib/db/serialize";
import { errorResponse, jsonResponse, parseJsonBody } from "../../../../lib/http";
import { assertPayeeIsNotTreasury } from "../../../../lib/payments/payee-guard";
import { isStellarPublicKey } from "../../../../lib/payments/stellar-address";

export const runtime = "nodejs";

const sellerApplicationSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  payoutAddress: z.string().trim().length(56),
  catalogueUrl: z.string().trim().url().max(500),
  termsGranted: z.string().trim().min(20).max(4000),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireDemoSession(request.headers);
    const parsed = await parseJsonBody(request, sellerApplicationSchema);
    if ("response" in parsed) return parsed.response;

    if (!isStellarPublicKey(parsed.data.payoutAddress)) {
      throw new RepositoryError(
        "INVALID_PAYOUT_ADDRESS",
        "Use a valid Stellar public key that starts with G.",
        400,
      );
    }
    assertPayeeIsNotTreasury(parsed.data.payoutAddress);

    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: context.ownerId, action: "seller" });
    const application = await createSellerApplication(db, {
      ownerId: context.ownerId,
      ...parsed.data,
    });

    return jsonResponse({ application: jsonSafe(application) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
