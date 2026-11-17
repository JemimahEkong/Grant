CREATE TYPE "public"."artifact_kind" AS ENUM('license_pdf', 'combined_pdf', 'audio');--> statement-breakpoint
CREATE TYPE "public"."artifact_state" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."attempt_phase" AS ENUM('created', 'signing_started', 'submitted', 'settled_verified', 'no_settlement_verified', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."license_intended_use" AS ENUM('organic', 'paid_ad');--> statement-breakpoint
CREATE TYPE "public"."license_platform" AS ENUM('instagram', 'facebook', 'tiktok', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."offer_kind" AS ENUM('base', 'addon');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('quoted', 'approved', 'reserved', 'payment_pending', 'settled', 'issuing', 'ready', 'refused', 'failed_no_settlement', 'expired');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_state" AS ENUM('not_started', 'pending', 'settled', 'no_settlement', 'operator_review');--> statement-breakpoint
CREATE TYPE "public"."reservation_state" AS ENUM('active', 'settled', 'released');--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"approving_human" text NOT NULL,
	"fingerprint" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_attempt_id" text,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approvals_purchase_fingerprint_unique" UNIQUE("purchase_id","fingerprint"),
	CONSTRAINT "approvals_human_nonempty" CHECK (length(btrim("approvals"."approving_human")) > 0),
	CONSTRAINT "approvals_fingerprint_sha256" CHECK (length("approvals"."fingerprint") = 64),
	CONSTRAINT "approvals_consumption_fields_match" CHECK (("approvals"."consumed_attempt_id" is null and "approvals"."consumed_at" is null) or ("approvals"."consumed_attempt_id" is not null and "approvals"."consumed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"kind" "artifact_kind" NOT NULL,
	"object_key" text,
	"content_hash" text,
	"generation_version" integer DEFAULT 1 NOT NULL,
	"state" "artifact_state" DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artifacts_license_kind_version_unique" UNIQUE("license_id","kind","generation_version"),
	CONSTRAINT "artifacts_generation_positive" CHECK ("artifacts"."generation_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "budget_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"amount_base_units" bigint NOT NULL,
	"reason" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_adjustments_amount_positive" CHECK ("budget_adjustments"."amount_base_units" > 0),
	CONSTRAINT "budget_adjustments_reason_nonempty" CHECK (length(btrim("budget_adjustments"."reason")) > 0),
	CONSTRAINT "budget_adjustments_creator_nonempty" CHECK (length(btrim("budget_adjustments"."created_by")) > 0)
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"project_id" text NOT NULL,
	"track_id" text NOT NULL,
	"kind" "offer_kind" NOT NULL,
	"parent_license_id" text,
	"license_number" text NOT NULL,
	"coverage_snapshot" jsonb NOT NULL,
	"coverage_hash" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "licenses_id_project_track_unique" UNIQUE("id","project_id","track_id"),
	CONSTRAINT "licenses_id_purchase_unique" UNIQUE("id","purchase_id"),
	CONSTRAINT "licenses_number_nonempty" CHECK (length(btrim("licenses"."license_number")) > 0),
	CONSTRAINT "licenses_coverage_hash_sha256" CHECK (length("licenses"."coverage_hash") = 64),
	CONSTRAINT "licenses_term_positive" CHECK ("licenses"."ends_at" > "licenses"."starts_at"),
	CONSTRAINT "licenses_parent_matches_kind" CHECK (("licenses"."kind" = 'base' and "licenses"."parent_license_id" is null) or ("licenses"."kind" = 'addon' and "licenses"."parent_license_id" is not null and "licenses"."parent_license_id" <> "licenses"."id"))
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text NOT NULL,
	"version" integer NOT NULL,
	"track_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"kind" "offer_kind" NOT NULL,
	"parent_offer_id" text,
	"parent_offer_version" integer,
	"authority_composition" boolean,
	"authority_master" boolean,
	"platforms_organic" "license_platform"[] NOT NULL,
	"platforms_paid_ad" "license_platform"[] NOT NULL,
	"territory_worldwide" boolean NOT NULL,
	"territory_countries" text[] NOT NULL,
	"maximum_term_days" integer NOT NULL,
	"maximum_clip_seconds" integer NOT NULL,
	"client_delivery" boolean,
	"reposting" boolean,
	"future_campaigns" boolean,
	"amount_base_units" bigint NOT NULL,
	"network" text NOT NULL,
	"asset_contract_id" text NOT NULL,
	"asset_decimals" integer DEFAULT 7 NOT NULL,
	"payee_address" text,
	"active" boolean DEFAULT true NOT NULL,
	"active_from" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_pk" PRIMARY KEY("id","version"),
	CONSTRAINT "offers_version_positive" CHECK ("offers"."version" > 0),
	CONSTRAINT "offers_amount_positive" CHECK ("offers"."amount_base_units" > 0),
	CONSTRAINT "offers_term_positive" CHECK ("offers"."maximum_term_days" > 0),
	CONSTRAINT "offers_clip_positive" CHECK ("offers"."maximum_clip_seconds" > 0),
	CONSTRAINT "offers_asset_decimals_range" CHECK ("offers"."asset_decimals" > 0 and "offers"."asset_decimals" <= 18),
	CONSTRAINT "offers_network_nonempty" CHECK (length(btrim("offers"."network")) > 0),
	CONSTRAINT "offers_asset_nonempty" CHECK (length(btrim("offers"."asset_contract_id")) > 0),
	CONSTRAINT "offers_territory_consistent" CHECK (("offers"."territory_worldwide" and cardinality("offers"."territory_countries") = 0) or (not "offers"."territory_worldwide" and cardinality("offers"."territory_countries") > 0)),
	CONSTRAINT "offers_parent_matches_kind" CHECK (("offers"."kind" = 'base' and "offers"."parent_offer_id" is null and "offers"."parent_offer_version" is null) or ("offers"."kind" = 'addon' and "offers"."parent_offer_id" is not null and "offers"."parent_offer_version" is not null and "offers"."parent_offer_id" <> "offers"."id"))
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"requirements_digest" text NOT NULL,
	"authorization_digest" text,
	"nonce" text,
	"authorization_valid_until" timestamp with time zone,
	"phase" "attempt_phase" DEFAULT 'created' NOT NULL,
	"reconciliation_state" "reconciliation_state" DEFAULT 'not_started' NOT NULL,
	"provider_reference" text,
	"transaction_hash" text,
	"signing_started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"reconciled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_purchase_number_unique" UNIQUE("purchase_id","attempt_number"),
	CONSTRAINT "payment_attempts_id_purchase_unique" UNIQUE("id","purchase_id"),
	CONSTRAINT "payment_attempts_number_positive" CHECK ("payment_attempts"."attempt_number" > 0),
	CONSTRAINT "payment_attempts_requirements_digest_sha256" CHECK (length("payment_attempts"."requirements_digest") = 64),
	CONSTRAINT "payment_attempts_authorization_fields_match" CHECK (("payment_attempts"."authorization_digest" is null and "payment_attempts"."authorization_valid_until" is null) or ("payment_attempts"."authorization_digest" is not null and "payment_attempts"."authorization_valid_until" is not null))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"client_private_name" text NOT NULL,
	"public_display_label" text NOT NULL,
	"brief_version" integer DEFAULT 1 NOT NULL,
	"brief_snapshot" jsonb NOT NULL,
	"brief_hash" text NOT NULL,
	"budget_base_units" bigint NOT NULL,
	"purchase_cap_base_units" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_owner_nonempty" CHECK (length(btrim("projects"."owner_id")) > 0),
	CONSTRAINT "projects_brief_version_positive" CHECK ("projects"."brief_version" > 0),
	CONSTRAINT "projects_brief_hash_sha256" CHECK (length("projects"."brief_hash") = 64),
	CONSTRAINT "projects_budget_nonnegative" CHECK ("projects"."budget_base_units" >= 0),
	CONSTRAINT "projects_cap_nonnegative" CHECK ("projects"."purchase_cap_base_units" >= 0)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text NOT NULL,
	"track_id" text NOT NULL,
	"offer_id" text NOT NULL,
	"offer_version" integer NOT NULL,
	"kind" "offer_kind" NOT NULL,
	"parent_purchase_id" text,
	"request_snapshot" jsonb NOT NULL,
	"offer_snapshot" jsonb NOT NULL,
	"coverage_snapshot" jsonb NOT NULL,
	"request_hash" text NOT NULL,
	"logical_intent_key" text NOT NULL,
	"coverage_hash" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "purchase_status" DEFAULT 'quoted' NOT NULL,
	"price_base_units" bigint NOT NULL,
	"term_days" integer NOT NULL,
	"network" text NOT NULL,
	"asset_contract_id" text NOT NULL,
	"asset_decimals" integer NOT NULL,
	"payee_address" text,
	"quote_expires_at" timestamp with time zone NOT NULL,
	"approval_fingerprint" text,
	"approved_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_owner_idempotency_unique" UNIQUE("owner_id","idempotency_key"),
	CONSTRAINT "purchases_id_project_track_unique" UNIQUE("id","project_id","track_id"),
	CONSTRAINT "purchases_id_price_unique" UNIQUE("id","price_base_units"),
	CONSTRAINT "purchases_price_positive" CHECK ("purchases"."price_base_units" > 0),
	CONSTRAINT "purchases_term_positive" CHECK ("purchases"."term_days" > 0),
	CONSTRAINT "purchases_request_hash_sha256" CHECK (length("purchases"."request_hash") = 64),
	CONSTRAINT "purchases_intent_hash_sha256" CHECK (length("purchases"."logical_intent_key") = 64),
	CONSTRAINT "purchases_coverage_hash_sha256" CHECK (length("purchases"."coverage_hash") = 64),
	CONSTRAINT "purchases_asset_decimals_range" CHECK ("purchases"."asset_decimals" > 0 and "purchases"."asset_decimals" <= 18),
	CONSTRAINT "purchases_parent_matches_kind" CHECK (("purchases"."kind" = 'base' and "purchases"."parent_purchase_id" is null) or ("purchases"."kind" = 'addon' and "purchases"."parent_purchase_id" is not null and "purchases"."parent_purchase_id" <> "purchases"."id")),
	CONSTRAINT "purchases_approval_fields_match_status" CHECK (("purchases"."status" in ('quoted', 'refused', 'expired')) or ("purchases"."status" in ('approved', 'reserved', 'payment_pending', 'settled', 'issuing', 'ready', 'failed_no_settlement') and "purchases"."approval_fingerprint" is not null and "purchases"."approved_at" is not null)),
	CONSTRAINT "purchases_settled_at_matches_status" CHECK (("purchases"."status" in ('settled', 'issuing', 'ready') and "purchases"."settled_at" is not null) or ("purchases"."status" not in ('settled', 'issuing', 'ready') and "purchases"."settled_at" is null))
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"purchase_id" text NOT NULL,
	"license_id" text NOT NULL,
	"network" text NOT NULL,
	"asset_contract_id" text NOT NULL,
	"payee_address" text NOT NULL,
	"amount_base_units" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"settlement_reference" text NOT NULL,
	"authorization_digest" text,
	"ledger" bigint,
	"verification_source" text NOT NULL,
	"safe_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_amount_positive" CHECK ("receipts"."amount_base_units" > 0),
	CONSTRAINT "receipts_transaction_nonempty" CHECK (length(btrim("receipts"."transaction_hash")) > 0),
	CONSTRAINT "receipts_settlement_reference_nonempty" CHECK (length(btrim("receipts"."settlement_reference")) > 0),
	CONSTRAINT "receipts_payee_nonempty" CHECK (length(btrim("receipts"."payee_address")) > 0)
);
--> statement-breakpoint
CREATE TABLE "refusals" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"purchase_id" text,
	"reason_code" text NOT NULL,
	"safe_explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refusals_reason_nonempty" CHECK (length(btrim("refusals"."reason_code")) > 0),
	CONSTRAINT "refusals_explanation_nonempty" CHECK (length(btrim("refusals"."safe_explanation")) > 0)
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"attempt_id" text NOT NULL,
	"project_id" text NOT NULL,
	"amount_base_units" bigint NOT NULL,
	"state" "reservation_state" DEFAULT 'active' NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_amount_positive" CHECK ("reservations"."amount_base_units" > 0),
	CONSTRAINT "reservations_state_fields_match" CHECK (("reservations"."state" = 'active' and "reservations"."settled_at" is null and "reservations"."released_at" is null) or ("reservations"."state" = 'settled' and "reservations"."settled_at" is not null and "reservations"."released_at" is null) or ("reservations"."state" = 'released' and "reservations"."released_at" is not null and "reservations"."settled_at" is null))
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"license_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "share_links_token_hash_sha256" CHECK (length("share_links"."token_hash") = 64),
	CONSTRAINT "share_links_creator_nonempty" CHECK (length(btrim("share_links"."created_by")) > 0)
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"seller_id" text NOT NULL,
	"audio_object_key" text,
	"duration_seconds" integer NOT NULL,
	"authority_composition" boolean,
	"authority_master" boolean,
	"provenance_reference" text,
	"is_fixture" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracks_title_nonempty" CHECK (length(btrim("tracks"."title")) > 0),
	CONSTRAINT "tracks_duration_positive" CHECK ("tracks"."duration_seconds" > 0)
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_adjustments" ADD CONSTRAINT "budget_adjustments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_parent_same_project_track_fk" FOREIGN KEY ("parent_license_id","project_id","track_id") REFERENCES "public"."licenses"("id","project_id","track_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_parent_offer_fk" FOREIGN KEY ("parent_offer_id","parent_offer_version") REFERENCES "public"."offers"("id","version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_offer_version_fk" FOREIGN KEY ("offer_id","offer_version") REFERENCES "public"."offers"("id","version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_parent_same_project_track_fk" FOREIGN KEY ("parent_purchase_id","project_id","track_id") REFERENCES "public"."purchases"("id","project_id","track_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_attempt_purchase_fk" FOREIGN KEY ("attempt_id","purchase_id") REFERENCES "public"."payment_attempts"("id","purchase_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_license_purchase_fk" FOREIGN KEY ("license_id","purchase_id") REFERENCES "public"."licenses"("id","purchase_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refusals" ADD CONSTRAINT "refusals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refusals" ADD CONSTRAINT "refusals_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_attempt_purchase_fk" FOREIGN KEY ("attempt_id","purchase_id") REFERENCES "public"."payment_attempts"("id","purchase_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_purchase_amount_fk" FOREIGN KEY ("purchase_id","amount_base_units") REFERENCES "public"."purchases"("id","price_base_units") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_one_unconsumed_per_purchase" ON "approvals" USING btree ("purchase_id") WHERE "approvals"."consumed_attempt_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_consumed_attempt_unique" ON "approvals" USING btree ("consumed_attempt_id") WHERE "approvals"."consumed_attempt_id" is not null;--> statement-breakpoint
CREATE INDEX "approvals_purchase_idx" ON "approvals" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "artifacts_license_idx" ON "artifacts" USING btree ("license_id");--> statement-breakpoint
CREATE INDEX "budget_adjustments_project_idx" ON "budget_adjustments" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "licenses_purchase_unique" ON "licenses" USING btree ("purchase_id");--> statement-breakpoint
CREATE UNIQUE INDEX "licenses_number_unique" ON "licenses" USING btree ("license_number");--> statement-breakpoint
CREATE INDEX "licenses_project_idx" ON "licenses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "offers_track_idx" ON "offers" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "offers_active_idx" ON "offers" USING btree ("active","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_authorization_digest_unique" ON "payment_attempts" USING btree ("authorization_digest") WHERE "payment_attempts"."authorization_digest" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_transaction_hash_unique" ON "payment_attempts" USING btree ("transaction_hash") WHERE "payment_attempts"."transaction_hash" is not null;--> statement-breakpoint
CREATE INDEX "payment_attempts_purchase_idx" ON "payment_attempts" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "projects_owner_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_active_intent_unique" ON "purchases" USING btree ("owner_id","logical_intent_key") WHERE "purchases"."status" in ('quoted', 'approved', 'reserved', 'payment_pending', 'settled', 'issuing', 'ready');--> statement-breakpoint
CREATE INDEX "purchases_project_idx" ON "purchases" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "purchases_owner_idx" ON "purchases" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_attempt_unique" ON "receipts" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_license_unique" ON "receipts" USING btree ("license_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_transaction_hash_unique" ON "receipts" USING btree ("transaction_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_settlement_reference_unique" ON "receipts" USING btree ("settlement_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_authorization_digest_unique" ON "receipts" USING btree ("authorization_digest") WHERE "receipts"."authorization_digest" is not null;--> statement-breakpoint
CREATE INDEX "receipts_purchase_idx" ON "receipts" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "refusals_owner_idx" ON "refusals" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "refusals_project_idx" ON "refusals" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_attempt_unique" ON "reservations" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_one_active_per_purchase" ON "reservations" USING btree ("purchase_id") WHERE "reservations"."state" = 'active';--> statement-breakpoint
CREATE INDEX "reservations_project_state_idx" ON "reservations" USING btree ("project_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_token_hash_unique" ON "share_links" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_one_active_per_license" ON "share_links" USING btree ("license_id") WHERE "share_links"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "share_links_project_idx" ON "share_links" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tracks_seller_idx" ON "tracks" USING btree ("seller_id");