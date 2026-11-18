import { assertSameOrigin } from "../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db/client";
import { consumeRateLimit } from "../../../../lib/db/rate-limit";
import { jsonSafe } from "../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../lib/http";
import { addTrustlineForOwner } from "../../../../lib/wallet/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "wallet" });
    return jsonResponse(jsonSafe(await addTrustlineForOwner(db, auth.ownerId)));
  } catch (error) {
    return errorResponse(error);
  }
}
