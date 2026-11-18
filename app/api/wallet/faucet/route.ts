import { assertSameOrigin } from "../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../lib/auth/session";
import { getDatabase } from "../../../../lib/db/client";
import { consumeRateLimit } from "../../../../lib/db/rate-limit";
import { jsonSafe } from "../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../lib/http";
import { fundWalletFromFaucet, getWalletView } from "../../../../lib/wallet/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "faucet" });
    const result = await fundWalletFromFaucet(db, auth.ownerId);
    const wallet = await getWalletView(db, auth.ownerId, { refresh: true });

    if (result.outcome === "confirmed") {
      return jsonResponse(jsonSafe({ ...result, wallet }), 200);
    }
    if (result.outcome === "already_funded") {
      return jsonResponse(jsonSafe({ code: "ALREADY_FUNDED", ...result, wallet }), 409);
    }
    if (result.outcome === "pending") {
      return jsonResponse(jsonSafe({ code: "FAUCET_PENDING", ...result, wallet }), 202);
    }
    if (result.outcome === "daily_cap") {
      return jsonResponse(jsonSafe({ code: "FAUCET_DAILY_CAP", message: "The daily treasury cap has been reached. Try again tomorrow.", wallet }), 429);
    }
    if (result.outcome === "treasury_empty") {
      return jsonResponse(jsonSafe({
        code: "FAUCET_TREASURY_EMPTY",
        message: "The faucet treasury is empty. Send testnet USDC to the address below, then refresh.",
        treasuryAddress: result.treasuryAddress,
        wallet,
      }), 503);
    }
    return jsonResponse(jsonSafe({ code: "FAUCET_FAILED", message: "The faucet transaction was rejected.", wallet }), 502);
  } catch (error) {
    return errorResponse(error);
  }
}
