import { jsonResponse } from "../../../lib/http";

export const runtime = "nodejs";

export function GET() {
  return jsonResponse({
    product: "Grant",
    status: "ok",
    phase: "persistence-foundation",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    purchasesEnabled: false,
  });
}
