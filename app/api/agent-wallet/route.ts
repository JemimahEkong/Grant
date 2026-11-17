import { requireDemoSession } from "../../../lib/auth/session";
import { errorResponse, jsonResponse } from "../../../lib/http";
import { getAgentWallet } from "../../../lib/payments/agent-wallet";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireDemoSession(request.headers);
    return jsonResponse(await getAgentWallet());
  } catch (error) {
    return errorResponse(error);
  }
}
