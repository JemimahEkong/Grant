import { and, eq } from "drizzle-orm";
import { stellarTestnetUsdc } from "../../demo/catalog";
import type { GrantDatabase } from "../db/client";
import { offers, type TrackRow } from "../db/schema";
import { assertOfferWithinLicense } from "../licensing/offer-license";
import { assertPayeeIsNotTreasury } from "../payments/payee-guard";

export const CATALOG_DEFAULT_PRICE_BASE_UNITS = 10_000_000n;
const platforms = ["instagram", "facebook", "tiktok", "youtube"] as const;

export function fixtureSellerPayee(env: Record<string, string | undefined> = process.env): string {
  const payee = env.X402_SELLER_PUBLIC?.trim();
  if (!payee) throw new Error("X402_SELLER_PUBLIC is not configured.");
  assertPayeeIsNotTreasury(payee, env);
  return payee;
}

export type EnsureOfferResult = {
  created: boolean;
  offerId: string;
};

export async function ensureBaseOffer(
  db: GrantDatabase,
  track: TrackRow,
  options: { payeeAddress?: string; priceBaseUnits?: bigint } = {},
): Promise<EnsureOfferResult> {
  // TODO: use each seller's own payout address once seller onboarding and payouts exist.
  // The shared fixture seller is intentional for this demo catalog.
  const payeeAddress = options.payeeAddress ?? fixtureSellerPayee();
  assertPayeeIsNotTreasury(payeeAddress);
  const priceBaseUnits = options.priceBaseUnits ?? CATALOG_DEFAULT_PRICE_BASE_UNITS;
  const paidAdsAllowed = track.commercialUse && track.derivatives;
  const standaloneAllowed = track.standaloneRedistribution;
  const terms = {
    platformsOrganic: [...platforms],
    platformsPaidAd: paidAdsAllowed ? [...platforms] : [],
    territoryWorldwide: true,
    territoryCountries: [] as string[],
    maximumTermDays: 90,
    maximumClipSeconds: 60,
    clientDelivery: standaloneAllowed,
    reposting: standaloneAllowed,
    futureCampaigns: false,
  };
  assertOfferWithinLicense(track, {
    platformsPaidAd: terms.platformsPaidAd,
    clientDelivery: terms.clientDelivery,
    reposting: terms.reposting,
    futureCampaigns: terms.futureCampaigns,
  });

  const [existing] = await db
    .select({ id: offers.id })
    .from(offers)
    .where(and(eq(offers.trackId, track.id), eq(offers.kind, "base"), eq(offers.version, 1)))
    .limit(1);

  const values = {
    trackId: track.id,
    sellerId: track.sellerId,
    kind: "base" as const,
    parentOfferId: null,
    parentOfferVersion: null,
    authorityComposition: track.authorityComposition ?? true,
    authorityMaster: track.authorityMaster ?? true,
    ...terms,
    amountBaseUnits: priceBaseUnits,
    network: stellarTestnetUsdc.network,
    assetContractId: stellarTestnetUsdc.assetContractId,
    assetDecimals: stellarTestnetUsdc.assetDecimals,
    payeeAddress,
    active: true,
    activeFrom: new Date("2020-01-01T00:00:00Z"),
    expiresAt: null,
  };

  if (existing) {
    await db.update(offers).set(values).where(eq(offers.id, existing.id));
    return { created: false, offerId: existing.id };
  }

  const id = `${track.id}-base`;
  const [inserted] = await db
    .insert(offers)
    .values({ id, version: 1, ...values })
    .onConflictDoNothing({ target: [offers.id, offers.version] })
    .returning({ id: offers.id });
  return { created: Boolean(inserted), offerId: inserted?.id ?? id };
}
