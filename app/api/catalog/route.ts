import { and, eq, sql } from "drizzle-orm";
import { demoDisclosure, demoOffers, demoTracks } from "../../../demo/catalog";
import { getDatabase } from "../../../lib/db/client";
import { jsonSafe } from "../../../lib/db/serialize";
import { offers, tracks } from "../../../lib/db/schema";
import { jsonResponse } from "../../../lib/http";
import { paymentsEnabled } from "../../../lib/payments/flags";
import type { CatalogItem } from "../../../lib/ui/api";

export const runtime = "nodejs";

export async function GET() {
  const payeeConfigured = Boolean(process.env.X402_SELLER_PUBLIC);
  const demoItems = demoOffers.filter(offer => offer.kind === "base").map(offer => {
    const track = demoTracks.find(candidate => candidate.id === offer.trackId);
    return {
      offerId: payeeConfigured ? `${offer.trackId}-testnet-base` : offer.id,
      fixtureOfferId: offer.id,
      offerVersion: offer.version,
      trackId: offer.trackId,
      title: track?.title ?? offer.title,
      sellerId: offer.sellerId,
      sellerName: track?.sellerName ?? offer.sellerId,
      durationSeconds: track?.durationSeconds ?? 0,
      bpm: track?.bpm ?? null,
      source: track?.source ?? null,
      sourceUrl: track?.sourceUrl ?? null,
      sourceId: track?.sourceId ?? null,
      sourceAuthor: track?.sourceAuthor ?? null,
      licenseCode: track?.licenseCode ?? null,
      licenseUrl: track?.licenseUrl ?? null,
      attributionRequired: track?.attributionRequired ?? null,
      attributionText: track?.attributionText ?? null,
      commercialUse: track?.commercialUse ?? null,
      derivatives: track?.derivatives ?? null,
      standaloneRedistribution: track?.standaloneRedistribution ?? null,
      previewAllowed: track?.previewAllowed ?? null,
      genre: track?.genre ?? null,
      moods: track?.moods ?? [],
      energy: track?.energy ?? null,
      instrumental: track?.instrumental ?? null,
      key: track?.key ?? null,
      previewKey: track?.previewKey ?? null,
      sourceLabel: track?.sourceLabel ?? null,
      provenanceReference: track?.provenanceReference ?? null,
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
  let ingestedOffers: unknown[] = [];
  let ingestedTracks: unknown[] = [];
  let demoTestnetOffers: unknown[] = [];
  try {
    const db = getDatabase();
    const rows = await db
      .select({ offer: offers, track: tracks })
      .from(offers)
      .innerJoin(tracks, eq(offers.trackId, tracks.id))
      .where(and(eq(offers.kind, "base"), eq(offers.active, true), sql`${tracks.id} like 'freesound-%'`))
      .orderBy(offers.id);
    const demoRows = await db
      .select()
      .from(offers)
      .where(and(eq(offers.kind, "base"), eq(offers.active, true), sql`${offers.id} like '%-testnet-base'`));
    demoTestnetOffers = demoRows;
    ingestedOffers = rows.map(row => row.offer);
    ingestedTracks = rows.map(row => row.track);
    ingestedItems = rows.map(({ offer, track }) => ({
      offerId: offer.id,
      fixtureOfferId: offer.id,
      offerVersion: offer.version,
      trackId: track.id,
      title: track.title,
      sellerId: track.sellerId,
      sellerName: track.sellerId === "grant-catalog" ? "Grant Catalog" : track.sellerId,
      durationSeconds: track.durationSeconds,
      bpm: track.bpm,
      source: track.source,
      sourceUrl: track.sourceUrl,
      sourceId: track.sourceId,
      sourceAuthor: track.sourceAuthor,
      licenseCode: track.licenseCode,
      licenseUrl: track.licenseUrl,
      attributionRequired: track.attributionRequired,
      attributionText: track.attributionText,
      commercialUse: track.commercialUse,
      derivatives: track.derivatives,
      standaloneRedistribution: track.standaloneRedistribution,
      previewAllowed: track.previewAllowed,
      genre: track.genre,
      moods: track.moods,
      energy: track.energy,
      instrumental: track.instrumental,
      key: track.key,
      previewKey: track.previewKey,
      sourceLabel: null,
      provenanceReference: track.provenanceReference,
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

  return jsonResponse(jsonSafe({
    mode: "fixture",
    purchasesEnabled: paymentsEnabled(),
    audioAvailable: true,
    disclosure: demoDisclosure,
    offers: [...demoTestnetOffers, ...ingestedOffers],
    tracks: [...demoTracks, ...ingestedTracks],
    items: [...demoItems, ...ingestedItems],
  }));
}
