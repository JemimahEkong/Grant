import { marketTermsSchema, type MarketPlatform, type MarketTerms } from "./terms";

export type BriefTerms = {
  platforms: MarketPlatform[];
  termDays: number;
  territory: { worldwide: boolean; countries: string[] };
  paidAds: boolean;
  clientDelivery: boolean;
  reposting: boolean;
  futureCampaigns: boolean;
  clipSeconds: number;
};

export type TermsRefusal = {
  code: string;
  message: string;
};

export function canonical(value: unknown): string {
  const sort = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(sort);
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [key, sort(entry)]),
      );
    }
    return input;
  };
  return JSON.stringify(sort(value));
}

export function sameTerms(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}

export function sellerPayloadTerms(payload: unknown): MarketTerms {
  return marketTermsSchema.parse(payload);
}

export function challengeTermsRefusal(
  listing: MarketTerms,
  challenge: MarketTerms,
): TermsRefusal | null {
  if (sameTerms(listing, challenge)) return null;
  return {
    code: "TERMS_CHANGED",
    message: "The challenge terms differ from the listing terms.",
  };
}

export function coverageRefusals(
  brief: BriefTerms,
  terms: MarketTerms,
  durationSeconds: number,
): TermsRefusal[] {
  const refusals: TermsRefusal[] = [];
  const missingPlatforms = brief.platforms.filter(platform => !terms.platforms.includes(platform));
  if (missingPlatforms.length > 0) {
    refusals.push({
      code: "PLATFORM_NOT_COVERED",
      message: `The seller does not offer ${missingPlatforms.join(", ")} for this track.`,
    });
  }
  if (brief.termDays > terms.termDays) {
    refusals.push({
      code: "TERM_TOO_SHORT",
      message: `The seller offers ${terms.termDays} days, and the brief asks for ${brief.termDays}.`,
    });
  }
  if (brief.paidAds && !terms.paidAds) {
    refusals.push({
      code: "PAID_ADS_NOT_OFFERED",
      message: "The brief asks for paid ads, and this track does not offer them.",
    });
  }
  if (brief.clientDelivery && !terms.clientDelivery) {
    refusals.push({
      code: "CLIENT_DELIVERY_NOT_OFFERED",
      message: "The brief includes client delivery, and this track does not offer it.",
    });
  }
  if (brief.reposting && !terms.reposting) {
    refusals.push({
      code: "REPOSTING_NOT_OFFERED",
      message: "The brief includes reposting, and this track does not offer it.",
    });
  }
  if (brief.futureCampaigns && !terms.futureCampaigns) {
    refusals.push({
      code: "FUTURE_CAMPAIGNS_NOT_OFFERED",
      message: "The brief includes future campaigns, and this track does not offer them.",
    });
  }
  if (brief.clipSeconds > durationSeconds) {
    refusals.push({
      code: "CLIP_TOO_LONG",
      message: `The track is ${durationSeconds} seconds, and the brief needs a ${brief.clipSeconds}-second clip.`,
    });
  }
  const territoryCovered =
    terms.territory.worldwide ||
    (!brief.territory.worldwide &&
      brief.territory.countries.every(country => terms.territory.countries.includes(country)));
  if (!territoryCovered) {
    const requested = brief.territory.worldwide ? "worldwide" : brief.territory.countries.join(", ");
    refusals.push({
      code: "TERRITORY_NOT_COVERED",
      message: `The seller does not cover ${requested}.`,
    });
  }
  return refusals;
}

function formatBaseUnits(value: bigint): string {
  const whole = value / 10_000_000n;
  const fraction = (value % 10_000_000n).toString().padStart(7, "0");
  return `${whole}.${fraction.slice(0, 2)}`;
}

export function priceRefusal(
  price: bigint,
  maxPrice: bigint,
  budget: bigint,
): TermsRefusal | null {
  if (price > maxPrice) {
    return {
      code: "PRICE_ABOVE_MAX",
      message: `The price ${formatBaseUnits(price)} USDC is above the max price ${formatBaseUnits(maxPrice)} USDC.`,
    };
  }
  if (price > budget) {
    return {
      code: "PRICE_ABOVE_BUDGET",
      message: `The price ${formatBaseUnits(price)} USDC is above the ${formatBaseUnits(budget)} USDC budget.`,
    };
  }
  return null;
}
