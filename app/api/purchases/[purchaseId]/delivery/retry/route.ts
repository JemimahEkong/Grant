import { assertSameOrigin } from "../../../../../../lib/auth/origin";
import { requireDemoSession } from "../../../../../../lib/auth/session";
import { getDatabase } from "../../../../../../lib/db/client";
import { consumeRateLimit } from "../../../../../../lib/db/rate-limit";
import { jsonSafe } from "../../../../../../lib/db/serialize";
import { errorResponse, jsonResponse } from "../../../../../../lib/http";
import { generateLicensePdfArtifact } from "../../../../../../lib/documents/delivery";
import { attachAudioArtifact } from "../../../../../../lib/documents/audio-delivery";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ purchaseId: string }> }) {
  try {
    assertSameOrigin(request);
    const auth = await requireDemoSession(request.headers);
    const { purchaseId } = await context.params;
    const db = getDatabase();
    await consumeRateLimit(db, { ownerId: auth.ownerId, action: "delivery" });
    const pdf = await generateLicensePdfArtifact(db, { ownerId: auth.ownerId, purchaseId });
    let audio;
    try {
      audio = await attachAudioArtifact(db, { ownerId: auth.ownerId, purchaseId });
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "AUDIO_NOT_PREPARED") throw error;
      audio = null;
    }
    const purchase = audio?.purchase ?? pdf.purchase;
    return jsonResponse(
      jsonSafe({
        pdf: { artifact: pdf.artifact, generated: pdf.generated, downloadPath: `/api/purchases/${purchaseId}/download?asset=pdf` },
        audio: audio
          ? { artifact: audio.artifact, attached: audio.attached, downloadPath: `/api/purchases/${purchaseId}/download?asset=audio` }
          : { state: "not_prepared" },
        purchase: { id: purchase.id, status: purchase.status },
      }),
      pdf.generated ? 201 : 200,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
