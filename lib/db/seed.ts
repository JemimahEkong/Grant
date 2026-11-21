import { demoOffers, demoTracks } from "../../demo/catalog";
import type { GrantDatabase } from "./client";
import { offers, tracks } from "./schema";
import { assertOfferWithinLicense } from "../licensing/offer-license";

export async function seedDemoCatalog(db: GrantDatabase): Promise<{ tracks: number; offers: number }> {
  for (const track of demoTracks) {
    await db
      .insert(tracks)
      .values({
        id: track.id,
        title: track.title,
        sellerId: track.sellerId,
        audioObjectKey: track.audioObjectKey,
        durationSeconds: track.durationSeconds,
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
        bpm: track.bpm,
        key: track.key,
        previewKey: track.previewKey,
        authorityComposition: track.authorityComposition,
        authorityMaster: track.authorityMaster,
        provenanceReference: track.provenanceReference,
        isFixture: track.isFixture,
      })
      .onConflictDoUpdate({
        target: tracks.id,
        set: {
          title: track.title,
          sellerId: track.sellerId,
          durationSeconds: track.durationSeconds,
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
          bpm: track.bpm,
          key: track.key,
          ...(track.previewKey ? { previewKey: track.previewKey } : {}),
          authorityComposition: track.authorityComposition,
          authorityMaster: track.authorityMaster,
          provenanceReference: track.provenanceReference,
          isFixture: track.isFixture,
        },
      });
  }

  const trackById = new Map(demoTracks.map(track => [track.id, track]));
  for (const offer of demoOffers) {
    const track = trackById.get(offer.trackId);
    if (!track) throw new Error(`The offer ${offer.id} has no track.`);
    assertOfferWithinLicense(track, {
      platformsPaidAd: offer.platformsByUse.paid_ad ?? [],
      clientDelivery: offer.clientDelivery,
      reposting: offer.reposting,
      futureCampaigns: offer.futureCampaigns,
    });
    await db
      .insert(offers)
      .values({
        id: offer.id,
        version: offer.version,
        trackId: offer.trackId,
        sellerId: offer.sellerId,
        kind: offer.kind,
        parentOfferId: offer.parentOfferId,
        parentOfferVersion: offer.parentOfferVersion,
        authorityComposition: offer.authority.composition,
        authorityMaster: offer.authority.master,
        platformsOrganic: offer.platformsByUse.organic ?? [],
        platformsPaidAd: offer.platformsByUse.paid_ad ?? [],
        territoryWorldwide: offer.territory.worldwide,
        territoryCountries: offer.territory.countries,
        maximumTermDays: offer.maximumTermDays,
        maximumClipSeconds: offer.maximumClipSeconds,
        clientDelivery: offer.clientDelivery,
        reposting: offer.reposting,
        futureCampaigns: offer.futureCampaigns,
        amountBaseUnits: BigInt(offer.amountBaseUnits),
        network: offer.network,
        assetContractId: offer.assetContractId,
        assetDecimals: offer.assetDecimals,
        payeeAddress: offer.payeeAddress,
        active: offer.active,
        activeFrom: new Date(),
        expiresAt: offer.expiresAt ? new Date(offer.expiresAt) : null,
      })
      .onConflictDoNothing({ target: [offers.id, offers.version] });
  }

  return { tracks: demoTracks.length, offers: demoOffers.length };
}
