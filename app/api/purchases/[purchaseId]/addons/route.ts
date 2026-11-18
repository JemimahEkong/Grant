import { z } from "zod";
import { assertSameOrigin } from "../../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db/client";
import { consumeRateLimit } from "../../../../../lib/db/rate-limit";
import { getAddonAvailability, quoteAddonPurchase } from "../../../../../lib/db/repositories";
import { jsonSafe } from "../../../../../lib/db/serialize";
import { errorResponse, jsonResponse, parseJsonBody } from "../../../../../lib/http";

export const runtime = "nodejs";

const addonSchema = z.strictObject({
  offerId: z.string().min(1).max(200),
  offerVersion: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(200),
});

export async function GET(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const availability = await getAddonAvailability(getDatabase(), {
      ownerId: auth.ownerId,
      purchaseId,
    });
    return jsonResponse(jsonSafe(availability));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const parsed = await parseJsonBody(request, addonSchema);
    if ("response" in parsed) return parsed.response;

    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "quote" });
    const outcome = await quoteAddonPurchase(db, {
      ownerId: auth.ownerId,
      parentPurchaseId: purchaseId,
      offerId: parsed.data.offerId,
      offerVersion: parsed.data.offerVersion,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    const status = outcome.outcome === "refused" ? 422 : outcome.outcome === "quoted" ? 201 : 200;
    return jsonResponse(jsonSafe(outcome), status);
  } catch (error) {
    return errorResponse(error);
  }
}
