import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Brief } from "../licensing/schema";
import type { CoverageSnapshot, StoredOfferSnapshot } from "../licensing/types";

export const licensePlatformEnum = pgEnum("license_platform", ["instagram", "facebook", "tiktok", "youtube"]);
export const intendedUseEnum = pgEnum("license_intended_use", ["organic", "paid_ad"]);
export const offerKindEnum = pgEnum("offer_kind", ["base", "addon"]);
export const trackSourceEnum = pgEnum("track_source", ["freesound", "fma", "pixabay", "original"]);
export const trackLicenseCodeEnum = pgEnum("license_code", [
  "cc0",
  "cc-by-4.0",
  "cc-by-3.0",
  "pixabay",
  "grant-commercial",
]);
export const purchaseStatusEnum = pgEnum("purchase_status", [
  "quoted",
  "approved",
  "reserved",
  "payment_pending",
  "settled",
  "issuing",
  "ready",
  "refused",
  "failed_no_settlement",
  "expired",
]);
export const reservationStateEnum = pgEnum("reservation_state", ["active", "settled", "released"]);
export const attemptPhaseEnum = pgEnum("attempt_phase", [
  "created",
  "signing_started",
  "submitted",
  "settled_verified",
  "no_settlement_verified",
  "uncertain",
]);
export const reconciliationStateEnum = pgEnum("reconciliation_state", [
  "not_started",
  "pending",
  "settled",
  "no_settlement",
  "operator_review",
]);
export const artifactKindEnum = pgEnum("artifact_kind", ["license_pdf", "combined_pdf", "audio"]);
export const artifactStateEnum = pgEnum("artifact_state", ["pending", "ready", "failed"]);
export const walletStatusEnum = pgEnum("wallet_status", ["created", "activated", "trustline", "funded"]);
export const faucetGrantStatusEnum = pgEnum("faucet_grant_status", ["pending", "confirmed", "failed"]);

const money = (name: string) => bigint(name, { mode: "bigint" });
const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());


// Better Auth tables. Field property names must match the Better Auth model;
// SQL column names stay snake_case. Do not rename these tables without updating
// the Drizzle adapter configuration.
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [index("user_email_idx").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  table => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    unique("account_provider_account_unique").on(table.providerId, table.accountId),
    index("account_user_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [index("verification_identifier_idx").on(table.identifier)],
);


export const rateLimits = pgTable(
  "rate_limits",
  {
    ownerId: text("owner_id").notNull(),
    action: text("action").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true, mode: "date" }).notNull(),
    count: integer("count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    primaryKey({ name: "rate_limits_pk", columns: [table.ownerId, table.action, table.windowStart] }),
    index("rate_limits_window_idx").on(table.windowStart),
    check("rate_limits_count_nonnegative", sql`${table.count} >= 0`),
  ],
);

export const wallets = pgTable(
  "wallets",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    publicKey: text("public_key").notNull(),
    encryptedSecret: text("encrypted_secret").notNull(),
    secretIv: text("secret_iv").notNull(),
    network: text("network").notNull().default("stellar:testnet"),
    status: walletStatusEnum("status").notNull().default("created"),
    activatedAt: timestamp("activated_at", { withTimezone: true, mode: "date" }),
    trustlineAt: timestamp("trustline_at", { withTimezone: true, mode: "date" }),
    fundedAt: timestamp("funded_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    uniqueIndex("wallets_owner_unique").on(table.ownerId),
    uniqueIndex("wallets_public_key_unique").on(table.publicKey),
    check("wallets_public_key_format", sql`${table.publicKey} ~ '^G[A-Z2-7]{55}$'`),
    check("wallets_network_testnet", sql`${table.network} = 'stellar:testnet'`),
    check("wallets_secret_nonempty", sql`length(${table.encryptedSecret}) > 0`),
    check("wallets_iv_nonempty", sql`length(${table.secretIv}) > 0`),
  ],
);

export const faucetGrants = pgTable(
  "faucet_grants",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    walletId: text("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
    amountBaseUnits: bigint("amount_base_units", { mode: "bigint" }).notNull(),
    status: faucetGrantStatusEnum("status").notNull().default("pending"),
    transactionHash: text("transaction_hash"),
    errorCode: text("error_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    uniqueIndex("faucet_grants_one_per_owner")
      .on(table.ownerId)
      .where(sql`${table.status} in ('pending', 'confirmed')`),
    uniqueIndex("faucet_grants_transaction_hash_unique")
      .on(table.transactionHash)
      .where(sql`${table.transactionHash} is not null`),
    index("faucet_grants_created_status_idx").on(table.createdAt, table.status),
    check("faucet_grants_amount_positive", sql`${table.amountBaseUnits} > 0`),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    clientPrivateName: text("client_private_name").notNull(),
    publicDisplayLabel: text("public_display_label").notNull(),
    briefVersion: integer("brief_version").notNull().default(1),
    briefSnapshot: jsonb("brief_snapshot").$type<Brief>().notNull(),
    briefHash: text("brief_hash").notNull(),
    budgetBaseUnits: money("budget_base_units").notNull(),
    purchaseCapBaseUnits: money("purchase_cap_base_units").notNull(),
    purchaseCountCap: integer("purchase_count_cap").notNull().default(2),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    index("projects_owner_idx").on(table.ownerId),
    check("projects_owner_nonempty", sql`length(btrim(${table.ownerId})) > 0`),
    check("projects_brief_version_positive", sql`${table.briefVersion} > 0`),
    check("projects_brief_hash_sha256", sql`length(${table.briefHash}) = 64`),
    check("projects_budget_nonnegative", sql`${table.budgetBaseUnits} >= 0`),
    check("projects_cap_nonnegative", sql`${table.purchaseCapBaseUnits} >= 0`),
    check("projects_count_cap_nonnegative", sql`${table.purchaseCountCap} >= 0`),
  ],
);

export const tracks = pgTable(
  "tracks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    sellerId: text("seller_id").notNull(),
    audioObjectKey: text("audio_object_key"),
    audioContentHash: text("audio_content_hash"),
    durationSeconds: integer("duration_seconds").notNull(),
    source: trackSourceEnum("source").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceId: text("source_id").notNull(),
    licenseCode: trackLicenseCodeEnum("license_code").notNull(),
    licenseUrl: text("license_url"),
    attributionRequired: boolean("attribution_required").notNull().default(false),
    attributionText: text("attribution_text").notNull(),
    commercialUse: boolean("commercial_use").notNull().default(false),
    derivatives: boolean("derivatives").notNull().default(false),
    standaloneRedistribution: boolean("standalone_redistribution").notNull().default(false),
    previewAllowed: boolean("preview_allowed").notNull().default(false),
    genre: text("genre"),
    moods: text("moods").array().notNull().default(sql`'{}'::text[]`),
    energy: integer("energy"),
    instrumental: boolean("instrumental"),
    bpm: integer("bpm"),
    key: text("key"),
    previewKey: text("preview_key"),
    authorityComposition: boolean("authority_composition"),
    authorityMaster: boolean("authority_master"),
    provenanceReference: text("provenance_reference"),
    isFixture: boolean("is_fixture").notNull().default(true),
    createdAt: createdAt(),
  },
  table => [
    index("tracks_seller_idx").on(table.sellerId),
    uniqueIndex("tracks_source_source_id_unique").on(table.source, table.sourceId),
    check("tracks_title_nonempty", sql`length(btrim(${table.title})) > 0`),
    check("tracks_duration_positive", sql`${table.durationSeconds} > 0`),
    check("tracks_source_url_nonempty", sql`length(btrim(${table.sourceUrl})) > 0`),
    check("tracks_source_id_nonempty", sql`length(btrim(${table.sourceId})) > 0`),
    check("tracks_attribution_text_nonempty", sql`length(btrim(${table.attributionText})) > 0`),
    check("tracks_energy_range", sql`${table.energy} is null or (${table.energy} >= 1 and ${table.energy} <= 5)`),
    check("tracks_bpm_positive", sql`${table.bpm} is null or ${table.bpm} > 0`),
    check("tracks_moods_max", sql`cardinality(${table.moods}) <= 4`),
  ],
);

export const offers = pgTable(
  "offers",
  {
    id: text("id").notNull(),
    version: integer("version").notNull(),
    trackId: text("track_id").notNull().references(() => tracks.id, { onDelete: "restrict" }),
    sellerId: text("seller_id").notNull(),
    kind: offerKindEnum("kind").notNull(),
    parentOfferId: text("parent_offer_id"),
    parentOfferVersion: integer("parent_offer_version"),
    authorityComposition: boolean("authority_composition"),
    authorityMaster: boolean("authority_master"),
    platformsOrganic: licensePlatformEnum("platforms_organic").array().notNull(),
    platformsPaidAd: licensePlatformEnum("platforms_paid_ad").array().notNull(),
    territoryWorldwide: boolean("territory_worldwide").notNull(),
    territoryCountries: text("territory_countries").array().notNull(),
    maximumTermDays: integer("maximum_term_days").notNull(),
    maximumClipSeconds: integer("maximum_clip_seconds").notNull(),
    clientDelivery: boolean("client_delivery"),
    reposting: boolean("reposting"),
    futureCampaigns: boolean("future_campaigns"),
    amountBaseUnits: money("amount_base_units").notNull(),
    network: text("network").notNull(),
    assetContractId: text("asset_contract_id").notNull(),
    assetDecimals: integer("asset_decimals").notNull().default(7),
    payeeAddress: text("payee_address"),
    active: boolean("active").notNull().default(true),
    activeFrom: timestamp("active_from", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  table => [
    primaryKey({ name: "offers_pk", columns: [table.id, table.version] }),
    foreignKey({
      name: "offers_parent_offer_fk",
      columns: [table.parentOfferId, table.parentOfferVersion],
      foreignColumns: [table.id, table.version],
    }),
    index("offers_track_idx").on(table.trackId),
    index("offers_active_idx").on(table.active, table.expiresAt),
    check("offers_version_positive", sql`${table.version} > 0`),
    check("offers_amount_positive", sql`${table.amountBaseUnits} > 0`),
    check("offers_term_positive", sql`${table.maximumTermDays} > 0`),
    check("offers_clip_positive", sql`${table.maximumClipSeconds} > 0`),
    check("offers_asset_decimals_range", sql`${table.assetDecimals} > 0 and ${table.assetDecimals} <= 18`),
    check("offers_network_nonempty", sql`length(btrim(${table.network})) > 0`),
    check("offers_asset_nonempty", sql`length(btrim(${table.assetContractId})) > 0`),
    check(
      "offers_territory_consistent",
      sql`(${table.territoryWorldwide} and cardinality(${table.territoryCountries}) = 0) or (not ${table.territoryWorldwide} and cardinality(${table.territoryCountries}) > 0)`,
    ),
    check(
      "offers_parent_matches_kind",
      sql`(${table.kind} = 'base' and ${table.parentOfferId} is null and ${table.parentOfferVersion} is null) or (${table.kind} = 'addon' and ${table.parentOfferId} is not null and ${table.parentOfferVersion} is not null and ${table.parentOfferId} <> ${table.id})`,
    ),
  ],
);

export const purchases = pgTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    trackId: text("track_id").notNull().references(() => tracks.id, { onDelete: "restrict" }),
    offerId: text("offer_id").notNull(),
    offerVersion: integer("offer_version").notNull(),
    kind: offerKindEnum("kind").notNull(),
    parentPurchaseId: text("parent_purchase_id"),
    requestSnapshot: jsonb("request_snapshot").$type<Brief>().notNull(),
    offerSnapshot: jsonb("offer_snapshot").$type<StoredOfferSnapshot>().notNull(),
    coverageSnapshot: jsonb("coverage_snapshot").$type<CoverageSnapshot>().notNull(),
    requestHash: text("request_hash").notNull(),
    logicalIntentKey: text("logical_intent_key").notNull(),
    coverageHash: text("coverage_hash").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: purchaseStatusEnum("status").notNull().default("quoted"),
    priceBaseUnits: money("price_base_units").notNull(),
    termDays: integer("term_days").notNull(),
    network: text("network").notNull(),
    assetContractId: text("asset_contract_id").notNull(),
    assetDecimals: integer("asset_decimals").notNull(),
    payeeAddress: text("payee_address"),
    quoteExpiresAt: timestamp("quote_expires_at", { withTimezone: true, mode: "date" }).notNull(),
    approvalFingerprint: text("approval_fingerprint"),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
    settledAt: timestamp("settled_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    unique("purchases_owner_idempotency_unique").on(table.ownerId, table.idempotencyKey),
    unique("purchases_id_project_track_unique").on(table.id, table.projectId, table.trackId),
    unique("purchases_id_price_unique").on(table.id, table.priceBaseUnits),
    foreignKey({
      name: "purchases_offer_version_fk",
      columns: [table.offerId, table.offerVersion],
      foreignColumns: [offers.id, offers.version],
    }),
    foreignKey({
      name: "purchases_parent_same_project_track_fk",
      columns: [table.parentPurchaseId, table.projectId, table.trackId],
      foreignColumns: [table.id, table.projectId, table.trackId],
    }),
    uniqueIndex("purchases_active_intent_unique")
      .on(table.ownerId, table.logicalIntentKey)
      .where(sql`${table.status} in ('quoted', 'approved', 'reserved', 'payment_pending', 'settled', 'issuing', 'ready')`),
    index("purchases_project_idx").on(table.projectId, table.status),
    index("purchases_owner_idx").on(table.ownerId),
    check("purchases_price_positive", sql`${table.priceBaseUnits} > 0`),
    check("purchases_term_positive", sql`${table.termDays} > 0`),
    check("purchases_request_hash_sha256", sql`length(${table.requestHash}) = 64`),
    check("purchases_intent_hash_sha256", sql`length(${table.logicalIntentKey}) = 64`),
    check("purchases_coverage_hash_sha256", sql`length(${table.coverageHash}) = 64`),
    check("purchases_asset_decimals_range", sql`${table.assetDecimals} > 0 and ${table.assetDecimals} <= 18`),
    check(
      "purchases_parent_matches_kind",
      sql`(${table.kind} = 'base' and ${table.parentPurchaseId} is null) or (${table.kind} = 'addon' and ${table.parentPurchaseId} is not null and ${table.parentPurchaseId} <> ${table.id})`,
    ),
    check(
      "purchases_approval_fields_match_status",
      sql`(${table.status} in ('quoted', 'refused', 'expired')) or (${table.status} in ('approved', 'reserved', 'payment_pending', 'settled', 'issuing', 'ready', 'failed_no_settlement') and ${table.approvalFingerprint} is not null and ${table.approvedAt} is not null)`,
    ),
    check(
      "purchases_settled_at_matches_status",
      sql`(${table.status} in ('settled', 'issuing', 'ready') and ${table.settledAt} is not null) or (${table.status} not in ('settled', 'issuing', 'ready') and ${table.settledAt} is null)`,
    ),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
    approvingHuman: text("approving_human").notNull(),
    fingerprint: text("fingerprint").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    consumedAttemptId: text("consumed_attempt_id"),
    consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  table => [
    unique("approvals_purchase_fingerprint_unique").on(table.purchaseId, table.fingerprint),
    uniqueIndex("approvals_one_unconsumed_per_purchase")
      .on(table.purchaseId)
      .where(sql`${table.consumedAttemptId} is null`),
    uniqueIndex("approvals_consumed_attempt_unique")
      .on(table.consumedAttemptId)
      .where(sql`${table.consumedAttemptId} is not null`),
    index("approvals_purchase_idx").on(table.purchaseId),
    check("approvals_human_nonempty", sql`length(btrim(${table.approvingHuman})) > 0`),
    check("approvals_fingerprint_sha256", sql`length(${table.fingerprint}) = 64`),
    check(
      "approvals_consumption_fields_match",
      sql`(${table.consumedAttemptId} is null and ${table.consumedAt} is null) or (${table.consumedAttemptId} is not null and ${table.consumedAt} is not null)`,
    ),
  ],
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    requirementsDigest: text("requirements_digest").notNull(),
    authorizationDigest: text("authorization_digest"),
    nonce: text("nonce"),
    authorizationValidUntil: timestamp("authorization_valid_until", { withTimezone: true, mode: "date" }),
    phase: attemptPhaseEnum("phase").notNull().default("created"),
    reconciliationState: reconciliationStateEnum("reconciliation_state").notNull().default("not_started"),
    providerReference: text("provider_reference"),
    transactionHash: text("transaction_hash"),
    signingStartedAt: timestamp("signing_started_at", { withTimezone: true, mode: "date" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" }),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    unique("payment_attempts_purchase_number_unique").on(table.purchaseId, table.attemptNumber),
    unique("payment_attempts_id_purchase_unique").on(table.id, table.purchaseId),
    uniqueIndex("payment_attempts_authorization_digest_unique")
      .on(table.authorizationDigest)
      .where(sql`${table.authorizationDigest} is not null`),
    uniqueIndex("payment_attempts_transaction_hash_unique")
      .on(table.transactionHash)
      .where(sql`${table.transactionHash} is not null`),
    index("payment_attempts_purchase_idx").on(table.purchaseId),
    check("payment_attempts_number_positive", sql`${table.attemptNumber} > 0`),
    check("payment_attempts_requirements_digest_sha256", sql`length(${table.requirementsDigest}) = 64`),
    check(
      "payment_attempts_authorization_fields_match",
      sql`(${table.authorizationDigest} is null and ${table.authorizationValidUntil} is null) or (${table.authorizationDigest} is not null and ${table.authorizationValidUntil} is not null)`,
    ),
  ],
);

export const reservations = pgTable(
  "reservations",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id").notNull(),
    attemptId: text("attempt_id").notNull(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    amountBaseUnits: money("amount_base_units").notNull(),
    state: reservationStateEnum("state").notNull().default("active"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true, mode: "date" }).notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true, mode: "date" }),
    releasedAt: timestamp("released_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  table => [
    uniqueIndex("reservations_attempt_unique").on(table.attemptId),
    uniqueIndex("reservations_one_active_per_purchase")
      .on(table.purchaseId)
      .where(sql`${table.state} = 'active'`),
    foreignKey({
      name: "reservations_attempt_purchase_fk",
      columns: [table.attemptId, table.purchaseId],
      foreignColumns: [paymentAttempts.id, paymentAttempts.purchaseId],
    }),
    foreignKey({
      name: "reservations_purchase_amount_fk",
      columns: [table.purchaseId, table.amountBaseUnits],
      foreignColumns: [purchases.id, purchases.priceBaseUnits],
    }),
    index("reservations_project_state_idx").on(table.projectId, table.state),
    check("reservations_amount_positive", sql`${table.amountBaseUnits} > 0`),
    check(
      "reservations_state_fields_match",
      sql`(${table.state} = 'active' and ${table.settledAt} is null and ${table.releasedAt} is null) or (${table.state} = 'settled' and ${table.settledAt} is not null and ${table.releasedAt} is null) or (${table.state} = 'released' and ${table.releasedAt} is not null and ${table.settledAt} is null)`,
    ),
  ],
);

export const licenses = pgTable(
  "licenses",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    trackId: text("track_id").notNull().references(() => tracks.id, { onDelete: "restrict" }),
    kind: offerKindEnum("kind").notNull(),
    parentLicenseId: text("parent_license_id"),
    licenseNumber: text("license_number").notNull(),
    coverageSnapshot: jsonb("coverage_snapshot").$type<CoverageSnapshot>().notNull(),
    coverageHash: text("coverage_hash").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
  },
  table => [
    uniqueIndex("licenses_purchase_unique").on(table.purchaseId),
    uniqueIndex("licenses_number_unique").on(table.licenseNumber),
    unique("licenses_id_project_track_unique").on(table.id, table.projectId, table.trackId),
    unique("licenses_id_purchase_unique").on(table.id, table.purchaseId),
    foreignKey({
      name: "licenses_parent_same_project_track_fk",
      columns: [table.parentLicenseId, table.projectId, table.trackId],
      foreignColumns: [table.id, table.projectId, table.trackId],
    }),
    index("licenses_project_idx").on(table.projectId),
    check("licenses_number_nonempty", sql`length(btrim(${table.licenseNumber})) > 0`),
    check("licenses_coverage_hash_sha256", sql`length(${table.coverageHash}) = 64`),
    check("licenses_term_positive", sql`${table.endsAt} > ${table.startsAt}`),
    check(
      "licenses_parent_matches_kind",
      sql`(${table.kind} = 'base' and ${table.parentLicenseId} is null) or (${table.kind} = 'addon' and ${table.parentLicenseId} is not null and ${table.parentLicenseId} <> ${table.id})`,
    ),
  ],
);

export const receipts = pgTable(
  "receipts",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id").notNull(),
    purchaseId: text("purchase_id").notNull(),
    licenseId: text("license_id").notNull(),
    network: text("network").notNull(),
    assetContractId: text("asset_contract_id").notNull(),
    payeeAddress: text("payee_address").notNull(),
    amountBaseUnits: money("amount_base_units").notNull(),
    transactionHash: text("transaction_hash").notNull(),
    settlementReference: text("settlement_reference").notNull(),
    authorizationDigest: text("authorization_digest"),
    ledger: bigint("ledger", { mode: "bigint" }),
    verificationSource: text("verification_source").notNull(),
    safeMetadata: jsonb("safe_metadata").$type<Record<string, unknown>>().notNull().default({}),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
  },
  table => [
    uniqueIndex("receipts_attempt_unique").on(table.attemptId),
    uniqueIndex("receipts_license_unique").on(table.licenseId),
    uniqueIndex("receipts_transaction_hash_unique").on(table.transactionHash),
    uniqueIndex("receipts_settlement_reference_unique").on(table.settlementReference),
    uniqueIndex("receipts_authorization_digest_unique")
      .on(table.authorizationDigest)
      .where(sql`${table.authorizationDigest} is not null`),
    foreignKey({
      name: "receipts_attempt_purchase_fk",
      columns: [table.attemptId, table.purchaseId],
      foreignColumns: [paymentAttempts.id, paymentAttempts.purchaseId],
    }),
    foreignKey({
      name: "receipts_license_purchase_fk",
      columns: [table.licenseId, table.purchaseId],
      foreignColumns: [licenses.id, licenses.purchaseId],
    }),
    index("receipts_purchase_idx").on(table.purchaseId),
    check("receipts_amount_positive", sql`${table.amountBaseUnits} > 0`),
    check("receipts_transaction_nonempty", sql`length(btrim(${table.transactionHash})) > 0`),
    check("receipts_settlement_reference_nonempty", sql`length(btrim(${table.settlementReference})) > 0`),
    check("receipts_payee_nonempty", sql`length(btrim(${table.payeeAddress})) > 0`),
  ],
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id").notNull().references(() => licenses.id, { onDelete: "cascade" }),
    kind: artifactKindEnum("kind").notNull(),
    objectKey: text("object_key"),
    contentHash: text("content_hash"),
    generationVersion: integer("generation_version").notNull().default(1),
    state: artifactStateEnum("state").notNull().default("pending"),
    errorCode: text("error_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  table => [
    unique("artifacts_license_kind_version_unique").on(table.licenseId, table.kind, table.generationVersion),
    index("artifacts_license_idx").on(table.licenseId),
    check("artifacts_generation_positive", sql`${table.generationVersion} > 0`),
  ],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    licenseId: text("license_id").notNull().references(() => licenses.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  table => [
    uniqueIndex("share_links_token_hash_unique").on(table.tokenHash),
    uniqueIndex("share_links_one_active_per_license")
      .on(table.licenseId)
      .where(sql`${table.revokedAt} is null`),
    index("share_links_project_idx").on(table.projectId),
    check("share_links_token_hash_sha256", sql`length(${table.tokenHash}) = 64`),
    check("share_links_creator_nonempty", sql`length(btrim(${table.createdBy})) > 0`),
  ],
);

export const refusals = pgTable(
  "refusals",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    purchaseId: text("purchase_id").references(() => purchases.id, { onDelete: "cascade" }),
    reasonCode: text("reason_code").notNull(),
    safeExplanation: text("safe_explanation").notNull(),
    createdAt: createdAt(),
  },
  table => [
    index("refusals_owner_idx").on(table.ownerId),
    index("refusals_project_idx").on(table.projectId),
    check("refusals_reason_nonempty", sql`length(btrim(${table.reasonCode})) > 0`),
    check("refusals_explanation_nonempty", sql`length(btrim(${table.safeExplanation})) > 0`),
  ],
);

export const budgetAdjustments = pgTable(
  "budget_adjustments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    amountBaseUnits: money("amount_base_units").notNull(),
    reason: text("reason").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
  },
  table => [
    index("budget_adjustments_project_idx").on(table.projectId),
    check("budget_adjustments_amount_positive", sql`${table.amountBaseUnits} > 0`),
    check("budget_adjustments_reason_nonempty", sql`length(btrim(${table.reason})) > 0`),
    check("budget_adjustments_creator_nonempty", sql`length(btrim(${table.createdBy})) > 0`),
  ],
);

export type WalletRow = typeof wallets.$inferSelect;
export type FaucetGrantRow = typeof faucetGrants.$inferSelect;
export type RateLimitRow = typeof rateLimits.$inferSelect;
export type UserRow = typeof user.$inferSelect;
export type AuthSessionRow = typeof session.$inferSelect;
export type AccountRow = typeof account.$inferSelect;
export type VerificationRow = typeof verification.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type TrackRow = typeof tracks.$inferSelect;
export type OfferRow = typeof offers.$inferSelect;
export type PurchaseRow = typeof purchases.$inferSelect;
export type ApprovalRow = typeof approvals.$inferSelect;
export type PaymentAttemptRow = typeof paymentAttempts.$inferSelect;
export type ReservationRow = typeof reservations.$inferSelect;
export type LicenseRow = typeof licenses.$inferSelect;
export type ReceiptRow = typeof receipts.$inferSelect;
export type ArtifactRow = typeof artifacts.$inferSelect;
export type ShareLinkRow = typeof shareLinks.$inferSelect;
export type RefusalRow = typeof refusals.$inferSelect;
export type BudgetAdjustmentRow = typeof budgetAdjustments.$inferSelect;
