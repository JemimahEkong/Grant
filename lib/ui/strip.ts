import type { Brief, Platform } from "../licensing/schema";
import type { OfferSnapshot } from "./api";
import { formatTerm, formatTerritory } from "./format";

export type StripSegment = { label: string; covered: boolean };

const platformShort: Record<Platform, string> = {
  instagram: "Insta",
  facebook: "FB",
  tiktok: "TikTok",
  youtube: "YT",
};

export function platformShortName(platform: Platform): string {
  return platformShort[platform];
}

export function platformsLabel(platforms: Platform[]): string {
  if (platforms.length === 0) return "No platforms";
  if (platforms.length <= 2) return platforms.map(platformShortName).join(" ");
  return `${platforms.length} platforms`;
}

export function buildReviewStrip(request: Brief, offer: OfferSnapshot): StripSegment[] {
  const allowedPlatforms = offer.platformsByUse[request.intendedUse] ?? [];
  const platformsCovered = request.platforms.every(platform => allowedPlatforms.includes(platform));
  const territoryCovered =
    offer.territory.worldwide ||
    (!request.territory.worldwide && request.territory.countries.every(code => offer.territory.countries.includes(code)));
  return [
    { label: `${request.intendedUse === "paid_ad" ? "Paid" : "Organic"} ${platformsLabel(request.platforms)}`, covered: platformsCovered },
    { label: formatTerm(request.termDays), covered: request.termDays <= offer.maximumTermDays },
    { label: formatTerritory(request.territory), covered: territoryCovered },
    { label: "Client", covered: offer.clientDelivery === true },
    { label: "Repost", covered: offer.reposting === true },
    { label: "Future", covered: offer.futureCampaigns === true },
  ];
}

export function buildCatalogStrip(offer: {
  platformsByUse: Partial<Record<"organic" | "paid_ad", Platform[]>>;
  territory: Brief["territory"];
  maximumTermDays: number;
  clientDelivery: boolean | null;
  reposting: boolean | null;
  futureCampaigns: boolean | null;
}): StripSegment[] {
  const platforms = offer.platformsByUse.organic ?? [];
  return [
    { label: platformsLabel(platforms), covered: platforms.length > 0 },
    { label: formatTerm(offer.maximumTermDays), covered: true },
    { label: formatTerritory(offer.territory), covered: true },
    { label: "Client", covered: offer.clientDelivery === true },
    { label: "Repost", covered: offer.reposting === true },
    { label: "Future", covered: offer.futureCampaigns === true },
  ];
}

export function buildProofStrip(coverage: {
  intendedUse: string;
  platforms: Platform[];
  territory: Brief["territory"];
  termDays: number;
  clientDelivery: boolean;
  reposting: boolean;
  futureCampaigns: boolean;
}): StripSegment[] {
  return [
    { label: `${coverage.intendedUse === "paid_ad" ? "Paid" : "Organic"} ${platformsLabel(coverage.platforms)}`, covered: true },
    { label: formatTerm(coverage.termDays), covered: true },
    { label: formatTerritory(coverage.territory), covered: true },
    { label: "Client", covered: coverage.clientDelivery },
    { label: "Repost", covered: coverage.reposting },
    { label: "Future", covered: coverage.futureCampaigns },
  ];
}

export function buildExclusions(request: Brief, offer: OfferSnapshot): string[] {
  const exclusions: string[] = [];
  if (request.intendedUse === "organic" && !(offer.platformsByUse.paid_ad ?? []).length) {
    exclusions.push("Paid advertising on any platform.");
  }
  if (offer.reposting !== true) exclusions.push("Re-uploading the track as standalone content.");
  if (offer.futureCampaigns !== true) exclusions.push("Future campaigns beyond this client project.");
  if (offer.clientDelivery !== true) exclusions.push("Delivering the track to a client.");
  exclusions.push(`Use beyond ${formatTerm(request.termDays)} or outside ${formatTerritory(request.territory)}.`);
  return exclusions;
}

export function coverageSummary(offer: {
  platformsByUse: Partial<Record<"organic" | "paid_ad", Platform[]>>;
  territory: Brief["territory"];
  maximumTermDays: number;
}): string {
  return `${platformsLabel(offer.platformsByUse.organic ?? [])} · ${formatTerritory(offer.territory)} · ${formatTerm(offer.maximumTermDays)}`;
}
