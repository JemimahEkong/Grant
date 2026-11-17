import { requireDemoSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db/client";
import { getPurchaseForOwner } from "../../../../lib/db/repositories";
import { jsonSafe } from "../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../lib/http";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const view = await getPurchaseForOwner(getDatabase(), {
      ownerId: auth.ownerId,
      purchaseId,
    });
    return jsonResponse(jsonSafe(view));
  } catch (error) {
    return errorResponse(error);
  }
}
