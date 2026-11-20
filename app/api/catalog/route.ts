import { demoDisclosure, demoOffers, demoTracks } from "../../../demo/catalog";
import { jsonResponse } from "../../../lib/http";
import { paymentsEnabled } from "../../../lib/payments/flags";

export const runtime = "nodejs";

export function GET() {
  const payeeConfigured = Boolean(process.env.X402_SELLER_PUBLIC);
  const items = demoOffers.filter(offer => offer.kind === "base").map(offer => {
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
  return jsonResponse({
    mode: "fixture",
    purchasesEnabled: paymentsEnabled(),
    audioAvailable: true,
    disclosure: demoDisclosure,
    offers: demoOffers,
    tracks: demoTracks,
    items,
  });
}
