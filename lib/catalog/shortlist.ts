import type { Brief } from "../licensing/schema";
import { matchOffer } from "../licensing/match";
import type { MatchableOffer } from "../licensing/types";
import type { CatalogItem } from "../ui/api";
import { formatDuration, formatTerm, formatTerritory, formatUsdc } from "../ui/format";
import { platformLabel } from "./discovery";

export type ShortlistEntry = {
  item: CatalogItem;
  reason: string;
  score: number;
};

export type ShortlistDiagnosis = {
  code: string;
  message: string;
  relaxation: string;
};

export type ShortlistResult = {
  entries: ShortlistEntry[];
  matchingCount: number;
  diagnosis: ShortlistDiagnosis | null;
};

const defaultLimit = 8;

function toMatchable(item: CatalogItem): MatchableOffer {
  return {
    id: item.offerId,
    trackId: item.trackId,
    authority: item.authority,
    platformsByUse: item.platformsByUse,
    territory: item.territory,
    maximumTermDays: item.maximumTermDays,
    maximumClipSeconds: item.maximumClipSeconds,
    clientDelivery: item.clientDelivery,
    reposting: item.reposting,
    futureCampaigns: item.futureCampaigns,
  };
}

function addedAt(item: CatalogItem): number {
  const parsed = Date.parse(item.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function durationLabel(seconds: number): string {
  return `${formatDuration(seconds)} (${seconds}s)`;
}

function scoreItem(item: CatalogItem, brief: Brief, availableBaseUnits: bigint): number {
  const headroom = Math.max(0, item.durationSeconds - brief.clipDurationSeconds);
  const durationScore = 1 / (1 + headroom);
  const moodScore = brief.mood ? (item.moods.includes(brief.mood) ? 1 : 0) : 0;
  const energyScore = brief.energy ? 1 - Math.abs((item.energy ?? 0) - brief.energy) / 4 : 0;
  const price = BigInt(item.amountBaseUnits);
  const available = availableBaseUnits > 0n ? availableBaseUnits : 0n;
  const fitsBudget = available > 0n && price <= available;
  const priceScore = available > 0n && fitsBudget ? 1 - Math.min(1, Number(price) / Number(available)) * 0.5 : 0;
  return durationScore * 0.55 + moodScore * 0.2 + energyScore * 0.15 + priceScore * 0.1;
}

function reasonFor(
  item: CatalogItem,
  brief: Brief,
  context: { closestHeadroom: number; moodLongestDuration: number | null },
): string {
  const platforms = brief.platforms.filter(platform => (item.platformsByUse[brief.intendedUse] ?? []).includes(platform));
  const platformText = platforms.map(platform => platformLabel(platform)).join(" and ");
  const duration = formatDuration(item.durationSeconds);
  const price = formatUsdc(item.amountBaseUnits);

  if (brief.intendedUse === "paid_ad" && platforms.length > 0) {
    return `covers paid ads on ${platformText}, ${duration} for your ${brief.clipDurationSeconds} seconds`;
  }
  if (brief.mood && item.moods.includes(brief.mood) && item.durationSeconds === context.moodLongestDuration) {
    return `longest track in ${brief.mood}, leaves room to trim`;
  }
  if ((item.platformsByUse.paid_ad ?? []).length === 0) {
    return `organic only, at ${price} USDC, fits your ${brief.termDays} days`;
  }
  if (item.durationSeconds - brief.clipDurationSeconds === context.closestHeadroom) {
    return context.closestHeadroom === 0
      ? `exactly ${brief.clipDurationSeconds} seconds, your clip length`
      : `only ${context.closestHeadroom}s longer than your ${brief.clipDurationSeconds}s clip`;
  }
  if (brief.mood && item.moods.includes(brief.mood)) {
    return `${brief.mood} mood, ${duration} for your ${brief.clipDurationSeconds} seconds`;
  }
  if (brief.energy && item.energy === brief.energy) {
    return `energy ${item.energy} matches your brief, ${duration} long`;
  }
  if (platforms.length === brief.platforms.length) {
    return `covers ${platformText}, ${duration} for your ${brief.clipDurationSeconds} seconds`;
  }
  return `${duration} track, fits your ${brief.termDays} days and ${formatTerritory(brief.territory)}`;
}

export function diagnoseShortlist(items: CatalogItem[], brief: Brief): ShortlistDiagnosis {
  const maxTrack = Math.max(0, ...items.map(item => item.durationSeconds));
  const maxClip = Math.max(0, ...items.map(item => item.maximumClipSeconds));
  const maxTerm = Math.max(0, ...items.map(item => item.maximumTermDays));

  if (maxTrack < brief.clipDurationSeconds) {
    const usable = Math.min(maxTrack, maxClip);
    const detail =
      maxTrack > maxClip
        ? `The longest track is ${durationLabel(maxTrack)}, but the longest licensed clip is ${durationLabel(maxClip)}`
        : `The longest track available is ${durationLabel(maxTrack)}`;
    return {
      code: "DURATION_NOT_COVERED",
      message: `${detail}, and your clip is ${durationLabel(brief.clipDurationSeconds)}.`,
      relaxation: `Shorten the clip to ${usable} seconds or less.`,
    };
  }

  const counts = new Map<string, number>();
  for (const item of items) {
    const codes = new Set(matchOffer(brief, toMatchable(item)).reasons.map(reason => reason.code));
    for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const code = ranked[0]?.[0] ?? "NO_TRACKS";

  switch (code) {
    case "DURATION_NOT_COVERED": {
      const usable = Math.min(maxTrack, maxClip);
      const detail =
        maxTrack > maxClip
          ? `The longest track is ${durationLabel(maxTrack)}, but the longest licensed clip is ${durationLabel(maxClip)}`
          : `The longest track available is ${durationLabel(maxTrack)}`;
      return {
        code,
        message: `${detail}, and your clip is ${durationLabel(brief.clipDurationSeconds)}.`,
        relaxation: `Shorten the clip to ${usable} seconds or less.`,
      };
    }
    case "PLATFORM_NOT_COVERED": {
      const requested = brief.platforms.map(platform => platformLabel(platform)).join(" and ");
      return {
        code,
        message: `No track covers ${requested} for ${brief.intendedUse === "paid_ad" ? "paid ads" : "organic"} use.`,
        relaxation: `Remove one platform from the brief or choose a different platform.`,
      };
    }
    case "TERM_NOT_COVERED":
      return {
        code,
        message: `No track covers ${formatTerm(brief.termDays)}. The longest term available is ${formatTerm(maxTerm)}.`,
        relaxation: `Shorten the term to ${formatTerm(maxTerm)} or less.`,
      };
    case "TERRITORY_NOT_COVERED":
      return {
        code,
        message: `No track covers ${formatTerritory(brief.territory)}.`,
        relaxation: `Use worldwide or remove the country from the brief.`,
      };
    case "CLIENT_USE_NOT_COVERED":
      return { code, message: "No track allows client delivery.", relaxation: "Turn off client delivery." };
    case "REPOSTING_NOT_COVERED":
      return { code, message: "No track allows reposting.", relaxation: "Turn off reposting." };
    case "FUTURE_CAMPAIGNS_NOT_COVERED":
      return { code, message: "No track offers future campaigns.", relaxation: "Turn off future campaigns." };
    case "USE_NOT_COVERED":
      return {
        code,
        message: `No track covers ${brief.intendedUse === "paid_ad" ? "paid ads" : "organic"} use.`,
        relaxation: "Switch to organic use.",
      };
    case "AUTHORITY_UNKNOWN":
      return {
        code,
        message: "No track explicitly grants both composition and master rights.",
        relaxation: "Choose a track with explicit authority.",
      };
    default:
      return { code, message: "No track matches this brief.", relaxation: "Widen the brief." };
  }
}

export function rankShortlist(
  items: CatalogItem[],
  brief: Brief,
  availableBaseUnits: bigint,
  limit = defaultLimit,
): ShortlistResult {
  const matching = items.filter(item => {
    if (item.durationSeconds < brief.clipDurationSeconds) return false;
    return matchOffer(brief, toMatchable(item)).compatible;
  });

  if (matching.length === 0) {
    return { entries: [], matchingCount: 0, diagnosis: diagnoseShortlist(items, brief) };
  }

  const closestHeadroom = Math.min(...matching.map(item => item.durationSeconds - brief.clipDurationSeconds));
  const mood = brief.mood;
  const withMood = mood ? matching.filter(item => item.moods.includes(mood)) : [];
  const moodLongestDuration = withMood.length > 0 ? Math.max(...withMood.map(item => item.durationSeconds)) : null;

  const entries = matching
    .map(item => ({ item, score: scoreItem(item, brief, availableBaseUnits) }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        addedAt(right.item) - addedAt(left.item) ||
        left.item.title.localeCompare(right.item.title),
    )
    .slice(0, limit)
    .map(({ item, score }) => ({
      item,
      score,
      reason: reasonFor(item, brief, { closestHeadroom, moodLongestDuration }),
    }));

  return { entries, matchingCount: matching.length, diagnosis: null };
}
