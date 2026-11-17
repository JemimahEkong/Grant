import type { GrantDatabase } from "../db/client";
import { RepositoryError } from "../db/errors";
import { getPurchaseForOwner, type PurchaseView } from "../db/repositories";
import type { ArtifactRow } from "../db/schema";
import { createSignedDownload } from "./r2";

export type DownloadAsset = "audio" | "pdf";

export type EntitlementView = {
  purchase: Pick<PurchaseView["purchase"], "id" | "ownerId" | "status">;
  license: Pick<NonNullable<PurchaseView["license"]>, "id" | "endsAt"> | null;
  artifacts: Pick<ArtifactRow, "kind" | "state" | "objectKey">[];
};

const settledStatuses = new Set(["settled", "issuing", "ready"]);

export function selectDownloadableArtifact(view: EntitlementView, asset: DownloadAsset): Pick<ArtifactRow, "kind" | "state" | "objectKey"> {
  if (!settledStatuses.has(view.purchase.status)) {
    throw new RepositoryError("PURCHASE_NOT_SETTLED", "A settled purchase is required for this download.", 403);
  }
  if (!view.license) {
    throw new RepositoryError("LICENSE_MISSING", "The purchase has no license.", 409);
  }
  if (view.license.endsAt <= new Date()) {
    throw new RepositoryError("LICENSE_EXPIRED", "The license has expired.", 403);
  }

  const kinds = asset === "audio" ? ["audio"] : ["license_pdf", "combined_pdf"];
  const artifact = view.artifacts.find(
    item => kinds.includes(item.kind) && item.state === "ready" && item.objectKey,
  );
  if (!artifact?.objectKey) {
    throw new RepositoryError("ARTIFACT_NOT_READY", "The requested deliverable is not ready.", 409);
  }
  return artifact;
}

export async function createDownloadUrl(
  db: GrantDatabase,
  input: {
    ownerId: string;
    purchaseId: string;
    asset: DownloadAsset;
    expiresInSeconds?: number;
  },
): Promise<{ url: string; expiresAt: string; artifactKind: string }> {
  const view = await getPurchaseForOwner(db, {
    ownerId: input.ownerId,
    purchaseId: input.purchaseId,
  });
  const artifact = selectDownloadableArtifact(view, input.asset);
  const signed = await createSignedDownload({
    key: artifact.objectKey as string,
    expiresInSeconds: input.expiresInSeconds ?? 300,
  });
  return {
    url: signed.url,
    expiresAt: signed.expiresAt,
    artifactKind: artifact.kind,
  };
}
