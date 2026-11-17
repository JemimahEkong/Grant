import { demoDisclosure, demoOffers } from "../../../demo/catalog";
import { jsonResponse } from "../../../lib/http";

export const runtime = "nodejs";

export function GET() {
  return jsonResponse({ mode: "fixture", purchasesEnabled: false, audioAvailable: false, disclosure: demoDisclosure, offers: demoOffers });
}
