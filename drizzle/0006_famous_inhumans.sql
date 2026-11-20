CREATE TYPE "public"."license_code" AS ENUM('cc0', 'cc-by-4.0', 'cc-by-3.0', 'pixabay', 'grant-commercial');--> statement-breakpoint
CREATE TYPE "public"."track_source" AS ENUM('freesound', 'fma', 'pixabay', 'original');--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "source" "track_source";--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "source_id" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "license_code" "license_code";--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "license_url" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "attribution_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "attribution_text" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "commercial_use" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "derivatives" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "standalone_redistribution" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "preview_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "genre" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "moods" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "energy" integer;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "instrumental" boolean;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "bpm" integer;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "preview_key" text;--> statement-breakpoint
UPDATE "tracks" SET
  "source" = 'freesound',
  "source_url" = CASE "id"
    WHEN 'morning-edit' THEN 'https://freesound.org/people/tyballer92/sounds/449812'
    WHEN 'quiet-cut' THEN 'https://freesound.org/people/indigo.cloud/sounds/254856'
    WHEN 'studio-pulse' THEN 'https://freesound.org/people/Seth_Makes_Sounds/sounds/687006'
  END,
  "source_id" = CASE "id"
    WHEN 'morning-edit' THEN '449812'
    WHEN 'quiet-cut' THEN '254856'
    WHEN 'studio-pulse' THEN '687006'
  END,
  "license_code" = 'cc0',
  "license_url" = 'https://creativecommons.org/publicdomain/zero/1.0/',
  "attribution_required" = false,
  "attribution_text" = 'CC0 · public domain',
  "commercial_use" = true,
  "derivatives" = true,
  "standalone_redistribution" = true,
  "preview_allowed" = true,
  "genre" = CASE "id"
    WHEN 'morning-edit' THEN 'acoustic'
    WHEN 'quiet-cut' THEN 'ambient'
    WHEN 'studio-pulse' THEN 'electronic'
  END,
  "moods" = CASE "id"
    WHEN 'morning-edit' THEN ARRAY['warm', 'uplifting']
    WHEN 'quiet-cut' THEN ARRAY['cinematic', 'minimal']
    WHEN 'studio-pulse' THEN ARRAY['driving', 'gritty']
  END,
  "energy" = CASE "id"
    WHEN 'morning-edit' THEN 3
    WHEN 'quiet-cut' THEN 1
    WHEN 'studio-pulse' THEN 4
  END,
  "instrumental" = true,
  "bpm" = CASE "id"
    WHEN 'morning-edit' THEN 129
    WHEN 'quiet-cut' THEN NULL
    WHEN 'studio-pulse' THEN 117
  END
WHERE "id" IN ('morning-edit', 'quiet-cut', 'studio-pulse');--> statement-breakpoint
ALTER TABLE "tracks" ALTER COLUMN "source" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ALTER COLUMN "source_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ALTER COLUMN "source_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ALTER COLUMN "license_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ALTER COLUMN "attribution_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_source_url_nonempty" CHECK (length(btrim("tracks"."source_url")) > 0);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_source_id_nonempty" CHECK (length(btrim("tracks"."source_id")) > 0);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_attribution_text_nonempty" CHECK (length(btrim("tracks"."attribution_text")) > 0);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_energy_range" CHECK ("tracks"."energy" is null or ("tracks"."energy" >= 1 and "tracks"."energy" <= 5));--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_bpm_positive" CHECK ("tracks"."bpm" is null or "tracks"."bpm" > 0);--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_moods_max" CHECK (cardinality("tracks"."moods") <= 4);
