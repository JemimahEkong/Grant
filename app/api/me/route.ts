import { requireDemoSession } from "../../../lib/auth/session";
import { errorResponse, jsonResponse } from "../../../lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const context = await requireDemoSession();
    return jsonResponse({
      user: context.user,
      demoAllowlisted: context.demoAllowlisted,
      session: { expiresAt: context.session.expiresAt },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
