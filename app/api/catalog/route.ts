import { and, eq, sql } from "drizzle-orm";
import { demoDisclosure, demoOffers, demoTracks } from "../../../demo/catalog";
import { getDatabase } from "../../../lib/db/client";
import { jsonSafe } from "../../../lib/db/serialize";
import { offers, tracks } from "../../../lib/db/schema";
import { publicJsonResponse } from "../../../lib/http";
import { paymentsEnabled } from "../../../lib/payments/flags";
import type { CatalogItem } from "../../../lib/ui/api";

export const runtime = "nodejs";

export async function GET() {
  const payeeConfigured = Boolean(process.env.X402_SELLER_PUBLIC);

  const demoItems: CatalogItem[] = demoOffers
    .filter(offer => offer.kind === "base")
    .map(offer => {
      const track = demoTracks.find(candidate => candidate.id === offer.trackId);
      return {
        offerId: payeeConfigured ? `${offer.trackId}-testnet-base` : offer.id,
        offerVersion: offer.version,
        trackId: offer.trackId,
        title: track?.title ?? offer.title,
        sellerId: offer.sellerId,
        sellerName: track?.sellerName ?? offer.sellerId,
        durationSeconds: track?.durationSeconds ?? 0,
        bpm: track?.bpm ?? null,
        sourceAuthor: track?.sourceAuthor ?? null,
        authority: offer.authority,
        createdAt: "2026-11-18T00:00:00.000Z",
        licenseCode: track?.licenseCode ?? null,
        attributionText: track?.attributionText ?? null,
        sourceUrl: track?.sourceUrl ?? null,
        genre: track?.genre ?? null,
        moods: track?.moods ?? [],
        energy: track?.energy ?? null,
        amountBaseUnits: offer.amountBaseUnits,
        platformsByUse: offer.platformsByUse,
        territory: offer.territory,
        maximumTermDays: offer.maximumTermDays,
        maximumClipSeconds: offer.maximumClipSeconds,
        clientDelivery: offer.clientDelivery,
        reposting: offer.reposting,
        futureCampaigns: offer.futureCampaigns,
        payeeConfigured,
      };
    });

  let ingestedItems: CatalogItem[] = [];
  try {
    const db = getDatabase();
    const rows = await db
      .select({ offer: offers, track: tracks })
      .from(offers)
      .innerJoin(tracks, eq(offers.trackId, tracks.id))
      .where(and(eq(offers.kind, "base"), eq(offers.active, true), sql`${tracks.id} like 'freesound-%'`))
      .orderBy(offers.id);

    ingestedItems = rows.map(({ offer, track }) => ({
      offerId: offer.id,
      offerVersion: offer.version,
      trackId: track.id,
      title: track.title,
      sellerId: track.sellerId,
      sellerName: track.sellerId === "grant-catalog" ? "Grant Catalog" : track.sellerId,
      durationSeconds: track.durationSeconds,
      bpm: track.bpm,
      sourceAuthor: track.sourceAuthor,
      authority: { composition: offer.authorityComposition, master: offer.authorityMaster },
      createdAt: track.createdAt.toISOString(),
      licenseCode: track.licenseCode,
      attributionText: track.attributionText,
      sourceUrl: track.sourceUrl,
      genre: track.genre,
      moods: track.moods,
      energy: track.energy,
      amountBaseUnits: offer.amountBaseUnits.toString(),
      platformsByUse: {
        organic: offer.platformsOrganic,
        paid_ad: offer.platformsPaidAd,
      },
      territory: {
        worldwide: offer.territoryWorldwide,
        countries: offer.territoryCountries,
      },
      maximumTermDays: offer.maximumTermDays,
      maximumClipSeconds: offer.maximumClipSeconds,
      clientDelivery: offer.clientDelivery,
      reposting: offer.reposting,
      futureCampaigns: offer.futureCampaigns,
      payeeConfigured: Boolean(offer.payeeAddress),
    }));
  } catch {
    ingestedItems = [];
  }

  return publicJsonResponse(
    jsonSafe({
      mode: "fixture",
      purchasesEnabled: paymentsEnabled(),
      audioAvailable: true,
      disclosure: demoDisclosure,
      items: [...demoItems, ...ingestedItems],
    }),
    { maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 600 },
  );
}
