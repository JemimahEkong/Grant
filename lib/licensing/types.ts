import type { Brief, IntendedUse, Platform } from "./schema";

export type TrackSource = "freesound" | "fma" | "pixabay" | "original";
export type TrackLicenseCode = "cc0" | "cc-by-4.0" | "cc-by-3.0" | "pixabay" | "grant-commercial";

export type RefusalReasonCode =
  | "AUTHORITY_UNKNOWN"
  | "USE_NOT_COVERED"
  | "PLATFORM_NOT_COVERED"
  | "TERRITORY_NOT_COVERED"
  | "TERM_NOT_COVERED"
  | "DURATION_NOT_COVERED"
  | "CLIENT_USE_NOT_COVERED"
  | "REPOSTING_NOT_COVERED"
  | "FUTURE_CAMPAIGNS_NOT_COVERED";

export type RefusalReason = {
  code: RefusalReasonCode;
  message: string;
};

export type CoverageResult = {
  offerId: string;
  trackId: string;
  compatible: boolean;
  reasons: RefusalReason[];
};

export type MatchableOffer = {
  id: string;
  trackId: string;
  authority: { composition: boolean | null; master: boolean | null };
  platformsByUse: Partial<Record<IntendedUse, Platform[]>>;
  territory: Brief["territory"];
  maximumTermDays: number;
  maximumClipSeconds: number;
  clientDelivery: boolean | null;
  reposting: boolean | null;
  futureCampaigns: boolean | null;
};

export type StoredOfferSnapshot = MatchableOffer & {
  version: number;
  sellerId: string;
  kind: "base" | "addon";
  parentOfferId: string | null;
  parentOfferVersion: number | null;
  amountBaseUnits: string;
  network: string;
  assetContractId: string;
  assetDecimals: number;
  payeeAddress: string | null;
};

export type CoverageSnapshot = {
  request: Brief;
  offer: StoredOfferSnapshot;
  result: CoverageResult;
};
