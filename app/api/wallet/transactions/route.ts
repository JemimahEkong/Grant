import { requireDemoSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db/client";
import { jsonSafe } from "../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../lib/http";
import { getWalletTransactionsForOwner } from "../../../../lib/wallet/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireDemoSession(request.headers);
    const transactions = await getWalletTransactionsForOwner(getDatabase(), auth.ownerId);
    return jsonResponse(jsonSafe({ transactions }));
  } catch (error) {
    return errorResponse(error);
  }
}
