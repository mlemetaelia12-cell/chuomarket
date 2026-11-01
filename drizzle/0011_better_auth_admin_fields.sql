ALTER TABLE "auth_users"
  ADD COLUMN IF NOT EXISTS "banned" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ban_reason" text,
  ADD COLUMN IF NOT EXISTS "ban_expires" timestamptz;
--> statement-breakpoint
ALTER TABLE "auth_sessions"
  ADD COLUMN IF NOT EXISTS "impersonated_by" text;