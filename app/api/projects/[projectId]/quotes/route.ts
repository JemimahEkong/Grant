import { z } from "zod";
import { assertSameOrigin } from "../../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db/client";
import { consumeRateLimit } from "../../../../../lib/db/rate-limit";
import { getProjectForOwner, quotePurchase } from "../../../../../lib/db/repositories";
import { jsonSafe } from "../../../../../lib/db/serialize";
import { errorResponse, jsonResponse, parseJsonBody } from "../../../../../lib/http";

export const runtime = "nodejs";

const quoteSchema = z.strictObject({
  trackId: z.string().min(1).max(200),
  offerId: z.string().min(1).max(200),
  offerVersion: z.number().int().positive(),
  kind: z.literal("base"),
  idempotencyKey: z.string().min(8).max(200),
});

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const { projectId } = await context.params;
    const parsed = await parseJsonBody(request, quoteSchema);
    if ("response" in parsed) return parsed.response;

    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "quote" });
    const projectView = await getProjectForOwner(db, {
      ownerId: auth.ownerId,
      projectId,
    });
    const outcome = await quotePurchase(db, {
      ownerId: auth.ownerId,
      projectId,
      trackId: parsed.data.trackId,
      offerId: parsed.data.offerId,
      offerVersion: parsed.data.offerVersion,
      kind: parsed.data.kind,
      briefVersion: projectView.project.briefVersion,
      request: projectView.project.briefSnapshot,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    const status = outcome.outcome === "refused" ? 422 : outcome.outcome === "quoted" ? 201 : 200;
    return jsonResponse(jsonSafe(outcome), status);
  } catch (error) {
    return errorResponse(error);
  }
}
