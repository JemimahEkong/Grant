CREATE TYPE "public"."faucet_grant_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('created', 'activated', 'trustline', 'funded');--> statement-breakpoint
CREATE TABLE "faucet_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"amount_base_units" bigint NOT NULL,
	"status" "faucet_grant_status" DEFAULT 'pending' NOT NULL,
	"transaction_hash" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faucet_grants_amount_positive" CHECK ("faucet_grants"."amount_base_units" > 0)
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_secret" text NOT NULL,
	"secret_iv" text NOT NULL,
	"network" text DEFAULT 'stellar:testnet' NOT NULL,
	"status" "wallet_status" DEFAULT 'created' NOT NULL,
	"activated_at" timestamp with time zone,
	"trustline_at" timestamp with time zone,
	"funded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_public_key_format" CHECK ("wallets"."public_key" ~ '^G[A-Z2-7]{55}$'),
	CONSTRAINT "wallets_network_testnet" CHECK ("wallets"."network" = 'stellar:testnet'),
	CONSTRAINT "wallets_secret_nonempty" CHECK (length("wallets"."encrypted_secret") > 0),
	CONSTRAINT "wallets_iv_nonempty" CHECK (length("wallets"."secret_iv") > 0)
);
--> statement-breakpoint
ALTER TABLE "faucet_grants" ADD CONSTRAINT "faucet_grants_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faucet_grants" ADD CONSTRAINT "faucet_grants_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "faucet_grants_one_per_owner" ON "faucet_grants" USING btree ("owner_id") WHERE "faucet_grants"."status" in ('pending', 'confirmed');--> statement-breakpoint
CREATE UNIQUE INDEX "faucet_grants_transaction_hash_unique" ON "faucet_grants" USING btree ("transaction_hash") WHERE "faucet_grants"."transaction_hash" is not null;--> statement-breakpoint
CREATE INDEX "faucet_grants_created_status_idx" ON "faucet_grants" USING btree ("created_at","status");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_owner_unique" ON "wallets" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_public_key_unique" ON "wallets" USING btree ("public_key");