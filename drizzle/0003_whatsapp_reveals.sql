CREATE TABLE "whatsapp_reveals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "whatsapp_reveals_user_created_idx"
ON "whatsapp_reveals" USING btree ("user_id", "created_at");