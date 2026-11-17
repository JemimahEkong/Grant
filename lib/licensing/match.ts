import type { Brief } from "./schema";
import type { CoverageResult, MatchableOffer, RefusalReason } from "./types";

export type { CoverageResult, RefusalReason } from "./types";

export function matchOffer(brief: Brief, offer: MatchableOffer): CoverageResult {
  const reasons: RefusalReason[] = [];
  if (offer.authority.composition !== true || offer.authority.master !== true) {
    reasons.push({ code: "AUTHORITY_UNKNOWN", message: "Composition and master permissions must both be explicitly offered." });
  }
  const platforms = offer.platformsByUse[brief.intendedUse];
  if (!platforms?.length) {
    reasons.push({ code: "USE_NOT_COVERED", message: `This offer does not cover ${brief.intendedUse} use.` });
  } else {
    for (const platform of brief.platforms) {
      if (!platforms.includes(platform)) reasons.push({ code: "PLATFORM_NOT_COVERED", message: `This offer does not cover ${brief.intendedUse} use on ${platform}.` });
    }
  }
  if (!offer.territory.worldwide && (brief.territory.worldwide || brief.territory.countries.some(country => !offer.territory.countries.includes(country)))) {
    reasons.push({ code: "TERRITORY_NOT_COVERED", message: "The requested territory exceeds this offer." });
  }
  if (brief.termDays > offer.maximumTermDays) reasons.push({ code: "TERM_NOT_COVERED", message: "The requested term exceeds this offer." });
  if (brief.clipDurationSeconds > offer.maximumClipSeconds) reasons.push({ code: "DURATION_NOT_COVERED", message: "The requested clip is longer than this offer allows." });
  if (brief.clientDelivery && offer.clientDelivery !== true) reasons.push({ code: "CLIENT_USE_NOT_COVERED", message: "Client delivery is not explicitly covered." });
  if (brief.reposting && offer.reposting !== true) reasons.push({ code: "REPOSTING_NOT_COVERED", message: "Reposting is not explicitly covered." });
  if (brief.futureCampaigns && offer.futureCampaigns !== true) reasons.push({ code: "FUTURE_CAMPAIGNS_NOT_COVERED", message: "Future campaigns are not explicitly covered." });
  return { offerId: offer.id, trackId: offer.trackId, compatible: reasons.length === 0, reasons };
}

export function matchCatalog(brief: Brief, offers: readonly MatchableOffer[]): CoverageResult[] {
  return offers.map(offer => matchOffer(brief, offer));
}
