ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "free_listing_claimed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

ALTER TABLE "listings"
ADD COLUMN IF NOT EXISTS "is_free_lifetime" boolean DEFAULT false NOT NULL;