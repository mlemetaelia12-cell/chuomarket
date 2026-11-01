
CREATE TYPE "user_role" AS ENUM ('user', 'admin', 'superadmin');
--> statement-breakpoint
CREATE TYPE "language" AS ENUM ('en', 'sw');
--> statement-breakpoint
CREATE TYPE "listing_status" AS ENUM ('draft', 'published', 'sold', 'hidden');
--> statement-breakpoint
CREATE TYPE "listing_category" AS ENUM ('books', 'electronics', 'clothes', 'utensils', 'other');
--> statement-breakpoint
CREATE TYPE "order_type" AS ENUM ('subscription', 'featured', 'boost');
--> statement-breakpoint
CREATE TYPE "order_status" AS ENUM ('pending', 'completed', 'failed', 'cancelled');
--> statement-breakpoint
CREATE TYPE "community_post_type" AS ENUM ('material', 'room', 'lost_found');
--> statement-breakpoint
CREATE TYPE "report_status" AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
--> statement-breakpoint
CREATE TYPE "point_event_type" AS ENUM ('daily_login', 'referral', 'redemption', 'admin_adjustment');
--> statement-breakpoint

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" varchar(32) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'user',
  "whatsapp" varchar(20),
  "language" "language" NOT NULL DEFAULT 'en',
  "points" integer NOT NULL DEFAULT 0,
  "referred_by" uuid,
  "banned" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "users_referred_by_users_id_fk"
    FOREIGN KEY ("referred_by") REFERENCES "users"("id") ON DELETE SET NULL
);
--> statement-breakpoint

CREATE INDEX "users_referred_by_idx"
ON "users" USING btree ("referred_by");
--> statement-breakpoint

CREATE TABLE "plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(32) NOT NULL UNIQUE,
  "name" varchar(80) NOT NULL,
  "price_tsh" integer NOT NULL,
  "duration_days" integer NOT NULL,
  "listing_limit" integer,
  "business_badge" boolean NOT NULL DEFAULT false,
  "priority_placement" boolean NOT NULL DEFAULT false,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" uuid NOT NULL REFERENCES "plans"("id") ON DELETE RESTRICT,
  "subscription_until" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "subscriptions_user_until_idx"
ON "subscriptions" USING btree ("user_id", "subscription_until");
--> statement-breakpoint

CREATE TABLE "listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(140) NOT NULL,
  "description" text NOT NULL,
  "status" "listing_status" NOT NULL DEFAULT 'draft',
  "category" "listing_category" NOT NULL,
  "price_tsh" integer NOT NULL,
  "meeting_place" varchar(180) NOT NULL,
  "featured_until" timestamptz,
  "boosted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "listings_owner_status_idx"
ON "listings" USING btree ("owner_id", "status");
--> statement-breakpoint
CREATE INDEX "listings_category_status_idx"
ON "listings" USING btree ("category", "status");
--> statement-breakpoint
CREATE INDEX "listings_created_at_idx"
ON "listings" USING btree ("created_at");
--> statement-breakpoint

CREATE TABLE "listing_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "file_url" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "listing_images_listing_idx"
ON "listing_images" USING btree ("listing_id");
--> statement-breakpoint

CREATE TABLE "favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "favorites_user_listing_unique" UNIQUE ("user_id", "listing_id")
);
--> statement-breakpoint

CREATE INDEX "favorites_listing_idx"
ON "favorites" USING btree ("listing_id");
--> statement-breakpoint

CREATE TABLE "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporter_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "listing_id" uuid REFERENCES "listings"("id") ON DELETE SET NULL,
  "reported_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reason" varchar(80) NOT NULL,
  "details" text,
  "status" "report_status" NOT NULL DEFAULT 'open',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "reports_status_created_idx"
ON "reports" USING btree ("status", "created_at");
--> statement-breakpoint

CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "listing_id" uuid REFERENCES "listings"("id") ON DELETE SET NULL,
  "plan_id" uuid REFERENCES "plans"("id") ON DELETE SET NULL,
  "type" "order_type" NOT NULL,
  "amount_tsh" integer NOT NULL,
  "status" "order_status" NOT NULL DEFAULT 'pending',
  "pesapal_tracking_id" varchar(128) UNIQUE,
  "pesapal_merchant_reference" varchar(128) UNIQUE,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "orders_user_created_idx"
ON "orders" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "orders_status_idx"
ON "orders" USING btree ("status");
--> statement-breakpoint

CREATE TABLE "listing_stats" (
  "listing_id" uuid PRIMARY KEY REFERENCES "listings"("id") ON DELETE CASCADE,
  "views" integer NOT NULL DEFAULT 0,
  "whatsapp_clicks" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "community_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "community_post_type" NOT NULL,
  "title" varchar(160) NOT NULL,
  "description" text NOT NULL,
  "course" varchar(120),
  "year" integer,
  "file_url" text,
  "meeting_place" varchar(180),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "community_posts_type_created_idx"
ON "community_posts" USING btree ("type", "created_at");
--> statement-breakpoint
CREATE INDEX "community_posts_course_year_idx"
ON "community_posts" USING btree ("course", "year");
--> statement-breakpoint

CREATE TABLE "point_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "point_event_type" NOT NULL,
  "points" integer NOT NULL,
  "description" varchar(180),
  "reference_id" uuid,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "point_events_user_created_idx"
ON "point_events" USING btree ("user_id", "created_at");
--> statement-breakpoint
