ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "auth_user_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_user_id_unique"
ON "users" ("auth_user_id");