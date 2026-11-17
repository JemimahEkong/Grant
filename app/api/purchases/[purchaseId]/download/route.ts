import { requireDemoSession } from "../../../../../lib/auth/session";
import { getDatabase } from "../../../../../lib/db/client";
import { RepositoryError } from "../../../../../lib/db/errors";
import { errorResponse, jsonResponse } from "../../../../../lib/http";
import { createDownloadUrl, type DownloadAsset } from "../../../../../lib/storage/entitlements";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const asset = new URL(request.url).searchParams.get("asset");
    if (asset !== "audio" && asset !== "pdf") {
      throw new RepositoryError("INVALID_ASSET", "Choose asset=audio or asset=pdf.", 400);
    }
    const result = await createDownloadUrl(getDatabase(), {
      ownerId: auth.ownerId,
      purchaseId,
      asset: asset as DownloadAsset,
    });
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
