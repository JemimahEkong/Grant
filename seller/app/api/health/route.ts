import { NextResponse } from "next/server";
import { getOffers } from "../../../lib/offers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  let offerCount = 0;
  try {
    offerCount = getOffers().length;
  } catch {
    offerCount = 0;
  }
  return NextResponse.json({
    status: "ok",
    service: "grant-market-seller",
    network: "stellar:testnet",
    payeeConfigured: Boolean(process.env.SELLER_PAYEE),
    offerCount,
  });
}
