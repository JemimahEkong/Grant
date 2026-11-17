import { jsonResponse } from "../lib/http";
import { paymentsEnabled } from "../lib/payments/flags";

export const runtime = "nodejs";

export function GET() {
  return jsonResponse({
    product: "Grant",
    phase: "persistence-foundation",
    endpoints: ["GET /api/health", "GET /api/catalog", "POST /api/license/matches"],
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    purchasesEnabled: paymentsEnabled(),
    message: "Durable licensing persistence is implemented. Purchases, signing, and the designed UI remain disabled.",
  });
}
