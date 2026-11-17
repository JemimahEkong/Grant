import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { withX402 } from "@x402/next";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/db/client";
import { loadSellerPurchase } from "../../../../lib/payments/seller-purchase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const network = "stellar:testnet";
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "https://www.x402.org/facilitator";

type TokenContext = {
  adapter: { getQueryParam?: (name: string) => string | string[] | undefined };
};

function tokenFromContext(context: TokenContext) {
  const value = context.adapter.getQueryParam?.("token");
  const token = Array.isArray(value) ? value[0] : value;
  if (!token) throw new Error("Missing attempt token.");
  return token;
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ code: "ATTEMPT_TOKEN_REQUIRED", message: "Missing attempt token." }, { status: 403 });
  }
  const { purchase } = await loadSellerPurchase(getDatabase(), token);
  return NextResponse.json({
    grantX402: "settled",
    mode: "approved-purchase-seller",
    purchaseId: purchase.id,
    network,
    note: "Payment received for an approved Grant purchase. License finalization runs in the buyer orchestration.",
    servedAt: new Date().toISOString(),
  });
}

const server = new x402ResourceServer(new HTTPFacilitatorClient({ url: facilitatorUrl })).register(
  network,
  new ExactStellarScheme(),
);

export const GET = withX402(
  handler,
  {
    accepts: {
      scheme: "exact",
      network,
      price: async context => {
        const { purchase } = await loadSellerPurchase(getDatabase(), tokenFromContext(context));
        return { asset: purchase.assetContractId, amount: purchase.priceBaseUnits.toString() };
      },
      payTo: async context => {
        const { purchase } = await loadSellerPurchase(getDatabase(), tokenFromContext(context));
        if (!purchase.payeeAddress) throw new Error("Missing seller payee.");
        return purchase.payeeAddress;
      },
    },
    description: "Approved Grant music license purchase",
    mimeType: "application/json",
  },
  server,
);
