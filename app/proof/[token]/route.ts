import { getDatabase } from "../../../lib/db/client";
import { getPublicProof } from "../../../lib/documents/share";

export const runtime = "nodejs";

const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const proof = await getPublicProof(getDatabase(), token);
  if (!proof) {
    return Response.json({ code: "PROOF_NOT_FOUND", message: "This proof link is not available." }, { status: 404, headers });
  }
  return Response.json(proof, { headers });
}
