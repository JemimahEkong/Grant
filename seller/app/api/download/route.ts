import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { verifyDownloadToken } from "../../../lib/download";
import { findLicenseById } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const payload = verifyDownloadToken(new URL(request.url).searchParams.get("token"));
  if (!payload) {
    return Response.json({ code: "DOWNLOAD_TOKEN_INVALID", message: "The download link is invalid or expired." }, { status: 403 });
  }

  const record = await findLicenseById(payload.licenseId);
  if (!record || record.offerId !== payload.offerId) {
    return Response.json({ code: "LICENSE_NOT_FOUND", message: "The license was not found." }, { status: 404 });
  }

  const file = path.join(process.cwd(), "audio", `${payload.offerId}.mp3`);
  const bytes = await readFile(file);
  return new Response(bytes, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${payload.offerId}.mp3"`,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
