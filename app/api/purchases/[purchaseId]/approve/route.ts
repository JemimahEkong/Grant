import { assertSameOrigin } from "../../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db/client";
import { approvePurchase } from "../../../../../lib/db/repositories";
import { jsonSafe } from "../../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../../lib/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const outcome = await approvePurchase(getDatabase(), {
      ownerId: auth.ownerId,
      purchaseId,
      approvingHuman: auth.user.email,
    });
    return jsonResponse(jsonSafe(outcome), outcome.outcome === "approved" ? 200 : 409);
  } catch (error) {
    return errorResponse(error);
  }
}
