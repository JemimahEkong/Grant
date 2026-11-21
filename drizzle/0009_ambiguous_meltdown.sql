CREATE TYPE "public"."seller_application_status" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "seller_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"payout_address" text NOT NULL,
	"catalogue_url" text NOT NULL,
	"terms_granted" text NOT NULL,
	"status" "seller_application_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_applications_name_nonempty" CHECK (length(btrim("seller_applications"."name")) > 0),
	CONSTRAINT "seller_applications_email_nonempty" CHECK (length(btrim("seller_applications"."email")) > 0),
	CONSTRAINT "seller_applications_payout_nonempty" CHECK (length(btrim("seller_applications"."payout_address")) > 0),
	CONSTRAINT "seller_applications_catalogue_nonempty" CHECK (length(btrim("seller_applications"."catalogue_url")) > 0),
	CONSTRAINT "seller_applications_terms_nonempty" CHECK (length(btrim("seller_applications"."terms_granted")) > 0)
);
--> statement-breakpoint
CREATE INDEX "seller_applications_owner_idx" ON "seller_applications" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "seller_applications_status_idx" ON "seller_applications" USING btree ("status");