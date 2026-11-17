CREATE TABLE "rate_limits" (
	"owner_id" text NOT NULL,
	"action" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limits_pk" PRIMARY KEY("owner_id","action","window_start"),
	CONSTRAINT "rate_limits_count_nonnegative" CHECK ("rate_limits"."count" >= 0)
);
--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");