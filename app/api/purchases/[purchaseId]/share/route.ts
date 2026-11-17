import { assertSameOrigin } from "../../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db/client";
import { consumeRateLimit } from "../../../../../lib/db/rate-limit";
import { errorResponse, jsonResponse } from "../../../../../lib/http";
import { createShareLink, revokeShareLink } from "../../../../../lib/documents/share";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "share" });
    const origin = process.env.APP_ORIGIN ?? process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
    const result = await createShareLink(db, {
      ownerId: auth.ownerId,
      purchaseId,
      createdBy: auth.user.email,
      origin,
    });
    return jsonResponse(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const result = await revokeShareLink(getDatabase(), { ownerId: auth.ownerId, purchaseId });
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
