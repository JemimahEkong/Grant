import { requireDemoSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db/client";
import { getProjectForOwner } from "../../../../lib/db/repositories";
import { jsonSafe } from "../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../lib/http";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const auth = await requireDemoSession(request.headers);
    const { projectId } = await context.params;
    const view = await getProjectForOwner(getDatabase(), {
      ownerId: auth.ownerId,
      projectId,
    });
    return jsonResponse(jsonSafe(view));
  } catch (error) {
    return errorResponse(error);
  }
}
