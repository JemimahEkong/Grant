import { and, eq } from "drizzle-orm";
import type { GrantDatabase } from "../db/client";
import { RepositoryError } from "../db/errors";
import { getPurchaseForOwner } from "../db/repositories";
import { artifacts, purchases, tracks, type ArtifactRow, type PurchaseRow } from "../db/schema";

export type AudioDelivery = {
  artifact: ArtifactRow;
  purchase: PurchaseRow;
  attached: boolean;
};

export async function attachAudioArtifact(
  db: GrantDatabase,
  input: { ownerId: string; purchaseId: string },
): Promise<AudioDelivery> {
  const view = await getPurchaseForOwner(db, input);
  if (view.purchase.status !== "settled" && view.purchase.status !== "issuing" && view.purchase.status !== "ready") {
    throw new RepositoryError("PURCHASE_NOT_SETTLED", "A settled purchase is required to deliver audio.", 403);
  }
  if (!view.license) {
    throw new RepositoryError("LICENSE_MISSING", "The purchase has no license.", 409);
  }
  const [track] = await db.select().from(tracks).where(eq(tracks.id, view.license.trackId)).limit(1);
  if (!track?.audioObjectKey || !track.audioContentHash) {
    throw new RepositoryError("AUDIO_NOT_PREPARED", "The track audio has not been prepared for private delivery.", 409);
  }

  const existing = view.artifacts.find(artifact => artifact.kind === "audio" && artifact.generationVersion === 1);
  if (existing?.state === "ready" && existing.objectKey) {
    return { artifact: existing, purchase: view.purchase, attached: false };
  }

  const [artifact] = await db
    .insert(artifacts)
    .values({
      id: existing?.id ?? `art_${track.audioContentHash.slice(0, 24)}`,
      licenseId: view.license.id,
      kind: "audio",
      objectKey: track.audioObjectKey,
      contentHash: track.audioContentHash,
      generationVersion: 1,
      state: "ready",
    })
    .onConflictDoUpdate({
      target: [artifacts.licenseId, artifacts.kind, artifacts.generationVersion],
      set: {
        objectKey: track.audioObjectKey,
        contentHash: track.audioContentHash,
        state: "ready",
        errorCode: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  const pdfReady = await db
    .select({ id: artifacts.id })
    .from(artifacts)
    .where(and(eq(artifacts.licenseId, view.license.id), eq(artifacts.kind, "license_pdf"), eq(artifacts.state, "ready")))
    .limit(1);

  let purchase = view.purchase;
  if (view.purchase.status !== "ready") {
    const nextStatus = pdfReady.length > 0 ? "ready" : "issuing";
    const [updated] = await db
      .update(purchases)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(purchases.id, view.purchase.id))
      .returning();
    purchase = updated;
  }

  return { artifact, purchase, attached: true };
}
