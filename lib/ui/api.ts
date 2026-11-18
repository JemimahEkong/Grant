import type { Brief, Platform } from "../licensing/schema";

export type OfferKind = "base" | "addon";

export class ApiFailure extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiFailure";
  }
}

export async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await parseBody(response);
  if (!response.ok) {
    const body = data as { code?: string; message?: string; outcome?: string } | null;
    throw new ApiFailure(
      response.status,
      body?.code ?? body?.outcome ?? `HTTP_${response.status}`,
      body?.message ?? "The request could not be completed.",
      data,
    );
  }
  return data as T;
}

export type Me = {
  user: { id: string; email: string; name: string };
  session: { expiresAt: string };
};

export type BudgetSummary = {
  budgetBaseUnits: string;
  purchaseCapBaseUnits: string;
  purchaseCountCap: number;
  purchasesUsed: number;
  confirmedSpendBaseUnits: string;
  activeReservationsBaseUnits: string;
  adjustmentsBaseUnits: string;
  availableBaseUnits: string;
};

export type Project = {
  id: string;
  ownerId: string;
  clientPrivateName: string;
  publicDisplayLabel: string;
  briefVersion: number;
  briefSnapshot: Brief;
  briefHash: string;
  budgetBaseUnits: string;
  purchaseCapBaseUnits: string;
  purchaseCountCap: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectView = {
  project: Project;
  purchases: Purchase[];
  refusals: Refusal[];
  adjustments: Array<{ id: string; projectId: string; amountBaseUnits: string; reason: string; createdBy: string; createdAt: string }>;
  budget: BudgetSummary;
};

export type Refusal = {
  id: string;
  ownerId: string;
  projectId: string | null;
  purchaseId: string | null;
  reasonCode: string;
  safeExplanation: string;
  createdAt: string;
};

export type PlatformsByUse = Partial<Record<"organic" | "paid_ad", Platform[]>>;

export type OfferSnapshot = {
  id: string;
  version: number;
  trackId: string;
  sellerId: string;
  kind: OfferKind;
  parentOfferId: string | null;
  parentOfferVersion: number | null;
  authority: { composition: boolean | null; master: boolean | null };
  platformsByUse: PlatformsByUse;
  territory: Brief["territory"];
  maximumTermDays: number;
  maximumClipSeconds: number;
  clientDelivery: boolean | null;
  reposting: boolean | null;
  futureCampaigns: boolean | null;
  amountBaseUnits: string;
  network: string;
  assetContractId: string;
  assetDecimals: number;
  payeeAddress: string | null;
};

export type CoverageSnapshot = {
  request: Brief;
  offer: OfferSnapshot;
  result: { offerId: string; trackId: string; compatible: boolean; reasons: Array<{ code: string; message: string }> };
};

export type Purchase = {
  id: string;
  ownerId: string;
  projectId: string;
  trackId: string;
  offerId: string;
  offerVersion: number;
  kind: OfferKind;
  parentPurchaseId: string | null;
  requestSnapshot: Brief;
  offerSnapshot: OfferSnapshot;
  coverageSnapshot: CoverageSnapshot;
  requestHash: string;
  logicalIntentKey: string;
  coverageHash: string;
  idempotencyKey: string;
  status: string;
  priceBaseUnits: string;
  termDays: number;
  network: string;
  assetContractId: string;
  assetDecimals: number;
  payeeAddress: string | null;
  quoteExpiresAt: string;
  approvalFingerprint: string | null;
  approvedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Approval = {
  id: string;
  purchaseId: string;
  approvingHuman: string;
  fingerprint: string;
  expiresAt: string;
  consumedAttemptId: string | null;
  consumedAt: string | null;
  createdAt: string;
};

export type Reservation = {
  id: string;
  purchaseId: string;
  attemptId: string;
  projectId: string;
  amountBaseUnits: string;
  state: string;
  leaseExpiresAt: string;
  settledAt: string | null;
  releasedAt: string | null;
  createdAt: string;
};

export type PaymentAttempt = {
  id: string;
  purchaseId: string;
  attemptNumber: number;
  requirementsDigest: string;
  authorizationDigest: string | null;
  nonce: string | null;
  authorizationValidUntil: string | null;
  phase: string;
  reconciliationState: string;
  providerReference: string | null;
  transactionHash: string | null;
  signingStartedAt: string | null;
  submittedAt: string | null;
  reconciledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type License = {
  id: string;
  purchaseId: string;
  projectId: string;
  trackId: string;
  kind: OfferKind;
  parentLicenseId: string | null;
  licenseNumber: string;
  coverageSnapshot: CoverageSnapshot;
  coverageHash: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type Receipt = {
  id: string;
  attemptId: string;
  purchaseId: string;
  licenseId: string;
  network: string;
  assetContractId: string;
  payeeAddress: string;
  amountBaseUnits: string;
  transactionHash: string;
  settlementReference: string;
  authorizationDigest: string | null;
  ledger: string | null;
  verificationSource: string;
  safeMetadata: Record<string, unknown>;
  verifiedAt: string;
  createdAt: string;
};

export type Artifact = {
  id: string;
  licenseId: string;
  kind: "license_pdf" | "combined_pdf" | "audio";
  objectKey: string | null;
  contentHash: string | null;
  generationVersion: number;
  state: "pending" | "ready" | "failed";
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Track = {
  id: string;
  title: string;
  sellerId: string;
  audioObjectKey: string | null;
  audioContentHash: string | null;
  durationSeconds: number;
  authorityComposition: boolean | null;
  authorityMaster: boolean | null;
  provenanceReference: string | null;
  isFixture: boolean;
  createdAt: string;
};

export type CoverageLicenseSummary = {
  licenseId: string;
  licenseNumber: string;
  purchaseId: string;
  kind: OfferKind;
  startsAt: string;
  endsAt: string;
  amountBaseUnits: string;
  transactionHash: string | null;
  organicPlatforms: Platform[];
  paidAdPlatforms: Platform[];
};

export type CombinedCoverage = {
  baseLicense: CoverageLicenseSummary | null;
  addonLicenses: CoverageLicenseSummary[];
  organicPlatforms: Platform[];
  paidAdPlatforms: Platform[];
  territory: Brief["territory"] | null;
  startsAt: string | null;
  endsAt: string | null;
  termDays: number | null;
  clipDurationSeconds: number | null;
  clientDelivery: boolean;
  reposting: boolean;
  futureCampaigns: boolean;
  totalBaseUnits: string;
};

export type AddonOfferView = {
  offerId: string;
  offerVersion: number;
  title: string;
  amountBaseUnits: string;
  platforms: Platform[];
  termDays: number;
  endsAt: string;
  territory: Brief["territory"];
  clipDurationSeconds: number;
  clientDelivery: boolean;
  available: boolean;
  reasons: Array<{ code: string; message: string }>;
};

export type AddonAvailability = {
  eligible: boolean;
  reason: string | null;
  parentPurchaseId: string;
  parentLicense: CoverageLicenseSummary | null;
  baseRequest: Brief | null;
  addons: AddonOfferView[];
  existing: CoverageLicenseSummary[];
  combinedCoverage: CombinedCoverage | null;
};

export type PurchaseView = {
  purchase: Purchase;
  project: Project | null;
  track: Track | null;
  approval: Approval | null;
  reservation: Reservation | null;
  attempts: PaymentAttempt[];
  receipt: Receipt | null;
  license: License | null;
  artifacts: Artifact[];
  refusal: Refusal | null;
  combinedCoverage: CombinedCoverage | null;
};

export type CatalogItem = {
  offerId: string;
  fixtureOfferId: string;
  offerVersion: number;
  trackId: string;
  title: string;
  sellerId: string;
  sellerName: string;
  durationSeconds: number;
  bpm: number | null;
  sourceLabel: string | null;
  provenanceReference: string | null;
  amountBaseUnits: string;
  platformsByUse: PlatformsByUse;
  territory: Brief["territory"];
  maximumTermDays: number;
  maximumClipSeconds: number;
  clientDelivery: boolean | null;
  reposting: boolean | null;
  futureCampaigns: boolean | null;
  payeeConfigured: boolean;
};

export type CatalogResponse = {
  mode: "fixture";
  purchasesEnabled: boolean;
  audioAvailable: boolean;
  disclosure: string;
  offers: unknown[];
  tracks: unknown[];
  items: CatalogItem[];
};

export type QuoteOutcome = {
  outcome: "quoted" | "reused" | "refused";
  purchase: Purchase | null;
  refusal?: Refusal;
  reasons?: Array<{ code: string; message: string }>;
};

export type ApprovalOutcome =
  | { outcome: "approved"; purchase: Purchase; approval: Approval }
  | { outcome: "expired"; purchase: Purchase };

export type PayOutcome = {
  outcome?: "settled";
  code?: string;
  purchase?: Purchase;
  receipt?: Receipt;
  license?: License;
  idempotent?: boolean;
  attemptId?: string | null;
  purchaseStatus?: string;
  statusUrl?: string;
  retryPolicy?: string;
};

export type WalletStep = "wallet" | "activate" | "trustline" | "fund" | "complete";

export type WalletView = {
  configured: boolean;
  id: string | null;
  address: string | null;
  network: "stellar:testnet";
  status: "created" | "activated" | "trustline" | "funded" | null;
  step: WalletStep;
  balance: string;
  xlm: string;
  exists: boolean;
  treasuryAddress: string | null;
  faucetAmountBaseUnits: string;
  dailyCapBaseUnits: string;
  custody: string;
};

export type WalletTransaction = {
  hash: string;
  createdAt: string;
  successful: boolean;
  type: string;
  label: string;
  amount: string | null;
  asset: string | null;
  direction: "in" | "out" | null;
};
