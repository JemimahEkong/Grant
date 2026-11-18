import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { GrantDatabase } from "../db/client";
import { RepositoryError } from "../db/errors";
import { getPurchaseForOwner } from "../db/repositories";
import { artifacts, projects, purchases, tracks, type ArtifactRow, type PurchaseRow } from "../db/schema";
import { putPrivateObject } from "../storage/r2";
import { buildLicensePdf } from "./license-pdf";

export type LicensePdfDelivery = {
  artifact: ArtifactRow;
  purchase: PurchaseRow;
  generated: boolean;
};

export async function generateLicensePdfArtifact(
  db: GrantDatabase,
  input: { ownerId: string; purchaseId: string },
): Promise<LicensePdfDelivery> {
  const view = await getPurchaseForOwner(db, input);
  if (view.purchase.status !== "settled" && view.purchase.status !== "issuing" && view.purchase.status !== "ready") {
    throw new RepositoryError("PURCHASE_NOT_SETTLED", "A settled purchase is required to generate a PDF.", 403);
  }
  if (!view.license) {
    throw new RepositoryError("LICENSE_MISSING", "The purchase has no license.", 409);
  }

  const existing = view.artifacts.find(
    artifact => artifact.kind === "license_pdf" && artifact.generationVersion === 1,
  );
  if (existing?.state === "ready" && existing.objectKey) {
    return { artifact: existing, purchase: view.purchase, generated: false };
  }

  const [track] = await db.select().from(tracks).where(eq(tracks.id, view.license.trackId)).limit(1);
  const [project] = await db.select().from(projects).where(eq(projects.id, view.purchase.projectId)).limit(1);
  if (!track || !project) {
    throw new RepositoryError("DELIVERY_CONTEXT_MISSING", "The track or project record is missing.", 409);
  }

  const request = view.license.coverageSnapshot.request;
  const pdf = await buildLicensePdf({
    licenseNumber: view.license.licenseNumber,
    publicDisplayLabel: project.publicDisplayLabel,
    trackTitle: track.title,
    sellerId: view.license.coverageSnapshot.offer.sellerId,
    audioProvenance: track.provenanceReference,
    startsAt: view.license.startsAt,
    endsAt: view.license.endsAt,
    purchaseId: view.purchase.id,
    licenseId: view.license.id,
    request,
    amountBaseUnits: view.receipt?.amountBaseUnits.toString() ?? view.purchase.priceBaseUnits.toString(),
    network: view.purchase.network,
    payeeAddress: view.purchase.payeeAddress,
    transactionHash: view.receipt?.transactionHash ?? null,
  });

  const generationVersion = 1;
  const objectKey = `licenses/${view.license.id}/license-${generationVersion}.pdf`;
  const contentHash = createHash("sha256").update(pdf).digest("hex");
  await putPrivateObject({
    key: objectKey,
    body: pdf,
    contentType: "application/pdf",
  });

  const [artifact] = await db
    .insert(artifacts)
    .values({
      id: existing?.id ?? `art_${createHash("sha256").update(`${view.license.id}:license_pdf:${generationVersion}`).digest("hex").slice(0, 24)}`,
      licenseId: view.license.id,
      kind: "license_pdf",
      objectKey,
      contentHash,
      generationVersion,
      state: "ready",
    })
    .onConflictDoUpdate({
      target: [artifacts.licenseId, artifacts.kind, artifacts.generationVersion],
      set: {
        objectKey,
        contentHash,
        state: "ready",
        errorCode: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  let purchase = view.purchase;
  if (view.purchase.status === "settled") {
    const [updated] = await db
      .update(purchases)
      .set({ status: "issuing", updatedAt: new Date() })
      .where(eq(purchases.id, view.purchase.id))
      .returning();
    purchase = updated;
  }

  return { artifact, purchase, generated: true };
}
