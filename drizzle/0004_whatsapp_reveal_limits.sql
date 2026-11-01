CREATE TABLE "whatsapp_reveal_limits" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "usage_date" date NOT NULL,
  "reveal_count" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_reveal_limits_user_date_unique" ON "whatsapp_reveal_limits" USING btree ("user_id", "usage_date");
