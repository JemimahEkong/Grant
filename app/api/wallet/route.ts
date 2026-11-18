import { assertSameOrigin } from "../../../lib/auth/origin";
import { requireDemoSession } from "../../../lib/auth/session";
import { getDatabase } from "../../../lib/db/client";
import { consumeRateLimit } from "../../../lib/db/rate-limit";
import { jsonSafe } from "../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../lib/http";
import { createWalletForOwner, getWalletView } from "../../../lib/wallet/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireDemoSession(request.headers);
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    const view = await getWalletView(getDatabase(), auth.ownerId, { refresh });
    return jsonResponse(jsonSafe(view));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "wallet" });
    const existing = await getWalletView(db, auth.ownerId);
    await createWalletForOwner(db, auth.ownerId);
    const view = await getWalletView(db, auth.ownerId);
    return jsonResponse(jsonSafe(view), existing.configured ? 200 : 201);
  } catch (error) {
    return errorResponse(error);
  }
}
