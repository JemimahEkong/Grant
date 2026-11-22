import { NextResponse } from "next/server";
import { getOffers } from "../../../lib/offers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { offers: getOffers() },
    { headers: { "Cache-Control": "public, max-age=30", "X-Content-Type-Options": "nosniff" } },
  );
}
