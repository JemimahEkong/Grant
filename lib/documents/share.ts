import { and, eq, isNull } from "drizzle-orm";
import { demoDisclosure } from "../../demo/catalog";
import type { GrantDatabase } from "../db/client";
import { randomId, randomToken, sha256Raw } from "../db/crypto";
import { RepositoryError } from "../db/errors";
import { getPurchaseForOwner } from "../db/repositories";
import { licenses, projects, purchases, receipts, shareLinks, tracks } from "../db/schema";

export type PublicProof = {
  product: "Grant";
  demoDisclosure: string;
  projectLabel: string;
  track: { title: string; sellerId: string };
  license: {
    number: string;
    startsAt: string;
    endsAt: string;
    coverage: {
      intendedUse: string;
      platforms: string[];
      territory: { worldwide: boolean; countries: string[] };
      termDays: number;
      clipDurationSeconds: number;
      clientDelivery: boolean;
      reposting: boolean;
      futureCampaigns: boolean;
    };
  };
  payment: {
    network: string;
    amountBaseUnits: string;
    transactionHash: string | null;
    verificationSource: string | null;
  };
  issuedAt: string;
};

function settledStatus(status: string): boolean {
  return status === "settled" || status === "issuing" || status === "ready";
}

export async function createShareLink(
  db: GrantDatabase,
  input: { ownerId: string; purchaseId: string; createdBy: string; origin: string },
): Promise<{ token: string; url: string; shareLinkId: string }> {
  const view = await getPurchaseForOwner(db, { ownerId: input.ownerId, purchaseId: input.purchaseId });
  if (!settledStatus(view.purchase.status)) {
    throw new RepositoryError("PURCHASE_NOT_SETTLED", "A settled purchase is required to share proof.", 403);
  }
  if (!view.license) {
    throw new RepositoryError("LICENSE_MISSING", "The purchase has no license.", 409);
  }

  const token = randomToken(32);
  const tokenHash = sha256Raw(token);
  const now = new Date();

  const shareLink = await db.transaction(async tx => {
    await tx
      .update(shareLinks)
      .set({ revokedAt: now })
      .where(and(eq(shareLinks.licenseId, view.license!.id), isNull(shareLinks.revokedAt)));
    const [row] = await tx
      .insert(shareLinks)
      .values({
        id: randomId("shr"),
        projectId: view.license!.projectId,
        licenseId: view.license!.id,
        tokenHash,
        createdBy: input.createdBy,
        createdAt: now,
      })
      .returning();
    return row;
  });

  return {
    token,
    url: `${input.origin.replace(/\/+$/, "")}/proof/${token}`,
    shareLinkId: shareLink.id,
  };
}

export async function revokeShareLink(
  db: GrantDatabase,
  input: { ownerId: string; purchaseId: string },
): Promise<{ revoked: number }> {
  const view = await getPurchaseForOwner(db, { ownerId: input.ownerId, purchaseId: input.purchaseId });
  if (!view.license) throw new RepositoryError("LICENSE_MISSING", "The purchase has no license.", 409);
  const revoked = await db
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(shareLinks.licenseId, view.license.id), isNull(shareLinks.revokedAt)))
    .returning({ id: shareLinks.id });
  return { revoked: revoked.length };
}

export async function getPublicProof(db: GrantDatabase, token: string): Promise<PublicProof | null> {
  const tokenHash = sha256Raw(token);
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(and(eq(shareLinks.tokenHash, tokenHash), isNull(shareLinks.revokedAt)))
    .limit(1);
  if (!link) return null;

  const [license] = await db.select().from(licenses).where(eq(licenses.id, link.licenseId)).limit(1);
  if (!license) return null;
  const [purchase] = await db.select().from(purchases).where(eq(purchases.id, license.purchaseId)).limit(1);
  if (!purchase) return null;
  const [project] = await db.select().from(projects).where(eq(projects.id, license.projectId)).limit(1);
  if (!project) return null;
  const [track] = await db.select().from(tracks).where(eq(tracks.id, license.trackId)).limit(1);
  if (!track) return null;
  const [receipt] = await db.select().from(receipts).where(eq(receipts.purchaseId, purchase.id)).limit(1);

  const request = license.coverageSnapshot.request;
  return {
    product: "Grant",
    demoDisclosure,
    projectLabel: project.publicDisplayLabel,
    track: { title: track.title, sellerId: license.coverageSnapshot.offer.sellerId },
    license: {
      number: license.licenseNumber,
      startsAt: license.startsAt.toISOString(),
      endsAt: license.endsAt.toISOString(),
      coverage: {
        intendedUse: request.intendedUse,
        platforms: request.platforms,
        territory: request.territory,
        termDays: request.termDays,
        clipDurationSeconds: request.clipDurationSeconds,
        clientDelivery: request.clientDelivery,
        reposting: request.reposting,
        futureCampaigns: request.futureCampaigns,
      },
    },
    payment: {
      network: purchase.network,
      amountBaseUnits: receipt?.amountBaseUnits.toString() ?? purchase.priceBaseUnits.toString(),
      transactionHash: receipt?.transactionHash ?? null,
      verificationSource: receipt?.verificationSource ?? null,
    },
    issuedAt: license.createdAt.toISOString(),
  };
}
