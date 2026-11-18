import { jsonResponse } from "../../../lib/http";
import { paymentsEnabled } from "../../../lib/payments/flags";

export const runtime = "nodejs";

export function GET() {
  return jsonResponse({
    product: "Grant",
    status: "ok",
    phase: "testnet-product-demo",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    purchasesEnabled: paymentsEnabled(),
  });
}
