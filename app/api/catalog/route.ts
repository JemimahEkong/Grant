import { demoDisclosure, demoOffers } from "../../../demo/catalog";
import { jsonResponse } from "../../../lib/http";
import { paymentsEnabled } from "../../../lib/payments/flags";

export const runtime = "nodejs";

export function GET() {
  return jsonResponse({ mode: "fixture", purchasesEnabled: paymentsEnabled(), audioAvailable: false, disclosure: demoDisclosure, offers: demoOffers });
}
