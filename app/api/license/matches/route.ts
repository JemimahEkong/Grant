import { demoDisclosure, demoOffers } from "../../../../demo/catalog";
import { jsonResponse, parseJsonBody } from "../../../../lib/http";
import { matchCatalog } from "../../../../lib/licensing/match";
import { briefSchema } from "../../../../lib/licensing/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, briefSchema);
  if ("response" in parsed) return parsed.response;
  return jsonResponse({
    mode: "fixture",
    purchasesEnabled: false,
    disclosure: demoDisclosure,
    results: matchCatalog(parsed.data, demoOffers),
  });
}
