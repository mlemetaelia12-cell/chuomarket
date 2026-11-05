-- Chuo Market V2: additive modules only. Existing Marketplace and Community data is untouched.

CREATE TYPE housing_listing_type AS ENUM ('room', 'hostel', 'bed_space');
--> statement-breakpoint
CREATE TYPE housing_room_type AS ENUM ('single', 'shared', 'self_contained', 'hostel');
--> statement-breakpoint
CREATE TYPE housing_listing_status AS ENUM ('published', 'filled', 'hidden');
--> statement-breakpoint
CREATE TYPE roommate_request_status AS ENUM ('active', 'closed');
--> statement-breakpoint
CREATE TYPE library_material_type AS ENUM ('notes', 'past_paper', 'study_guide', 'assignment', 'revision');
--> statement-breakpoint
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'removed');
--> statement-breakpoint
CREATE TYPE alert_category AS ENUM ('academic_deadline', 'registration', 'examinations', 'scholarships', 'events', 'announcements', 'lost_found');
--> statement-breakpoint
CREATE TYPE alert_trust AS ENUM ('official', 'community', 'unverified');
--> statement-breakpoint
CREATE TYPE campus_alert_status AS ENUM ('published', 'removed');
--> statement-breakpoint
CREATE TYPE service_category AS ENUM ('web_development', 'graphic_design', 'photography', 'tutoring', 'typing', 'technical_support', 'other');
--> statement-breakpoint
CREATE TYPE service_listing_status AS ENUM ('published', 'paused', 'closed', 'removed');
--> statement-breakpoint

CREATE TABLE housing_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  listing_type housing_listing_type NOT NULL,
  title varchar(140) NOT NULL,
  description text NOT NULL,
  university varchar(160) NOT NULL,
  campus varchar(160) NOT NULL,
  area varchar(180) NOT NULL,
  monthly_price_tsh integer NOT NULL CHECK (monthly_price_tsh > 0),
  room_type housing_room_type NOT NULL,
  available_spaces integer NOT NULL DEFAULT 1 CHECK (available_spaces > 0),
  status housing_listing_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT housing_listings_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX housing_listings_status_created_idx ON housing_listings(status, created_at);
CREATE INDEX housing_listings_campus_status_idx ON housing_listings(campus, status);
CREATE INDEX housing_listings_owner_idx ON housing_listings(owner_id);
CREATE INDEX housing_listings_price_idx ON housing_listings(monthly_price_tsh);
--> statement-breakpoint

CREATE TABLE housing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  housing_listing_id uuid NOT NULL,
  object_key varchar(500) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT housing_images_housing_listing_id_housing_listings_id_fk FOREIGN KEY (housing_listing_id) REFERENCES public.housing_listings(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT housing_images_object_key_unique UNIQUE (object_key)
);
--> statement-breakpoint
CREATE INDEX housing_images_listing_idx ON housing_images(housing_listing_id);
--> statement-breakpoint

CREATE TABLE roommate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  introduction varchar(600) NOT NULL,
  university varchar(160) NOT NULL,
  campus varchar(160) NOT NULL,
  preferred_area varchar(180) NOT NULL,
  min_budget_tsh integer NOT NULL CHECK (min_budget_tsh >= 0),
  max_budget_tsh integer NOT NULL CHECK (max_budget_tsh >= min_budget_tsh),
  requirements varchar(800) NOT NULL,
  move_in_period varchar(120) NOT NULL,
  status roommate_request_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roommate_requests_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX roommate_requests_status_created_idx ON roommate_requests(status, created_at);
CREATE INDEX roommate_requests_campus_status_idx ON roommate_requests(campus, status);
CREATE INDEX roommate_requests_owner_idx ON roommate_requests(owner_id);
--> statement-breakpoint

CREATE TABLE study_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL,
  title varchar(160) NOT NULL,
  description varchar(1200) NOT NULL,
  university varchar(160) NOT NULL,
  program varchar(160) NOT NULL,
  study_year integer NOT NULL CHECK (study_year BETWEEN 1 AND 8),
  subject varchar(160) NOT NULL,
  material_type library_material_type NOT NULL,
  object_key varchar(500) NOT NULL,
  file_name varchar(255) NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type varchar(100) NOT NULL DEFAULT 'application/pdf' CHECK (mime_type = 'application/pdf'),
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  download_count integer NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_materials_uploader_id_users_id_fk FOREIGN KEY (uploader_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT study_materials_object_key_unique UNIQUE (object_key)
);
--> statement-breakpoint
CREATE INDEX study_materials_status_created_idx ON study_materials(moderation_status, created_at);
CREATE INDEX study_materials_university_program_idx ON study_materials(university, program);
CREATE INDEX study_materials_year_subject_idx ON study_materials(study_year, subject);
CREATE INDEX study_materials_popular_idx ON study_materials(download_count);
CREATE INDEX study_materials_uploader_idx ON study_materials(uploader_id);
--> statement-breakpoint

CREATE TABLE campus_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id uuid NOT NULL,
  title varchar(160) NOT NULL,
  description varchar(3000) NOT NULL,
  category alert_category NOT NULL,
  university varchar(160),
  campus varchar(160),
  trust_label alert_trust NOT NULL DEFAULT 'community',
  source_name varchar(180),
  source_url varchar(1000),
  published_at timestamptz,
  expires_at timestamptz,
  status campus_alert_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campus_alerts_expiry_after_publish CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at),
  CONSTRAINT campus_alerts_publisher_id_users_id_fk FOREIGN KEY (publisher_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX campus_alerts_current_idx ON campus_alerts(status, published_at, expires_at);
CREATE INDEX campus_alerts_campus_category_idx ON campus_alerts(campus, category);
CREATE INDEX campus_alerts_publisher_idx ON campus_alerts(publisher_id);
--> statement-breakpoint

CREATE TABLE service_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  title varchar(140) NOT NULL,
  description varchar(1600) NOT NULL,
  category service_category NOT NULL,
  price_from_tsh integer CHECK (price_from_tsh IS NULL OR price_from_tsh >= 0),
  price_to_tsh integer CHECK (price_to_tsh IS NULL OR price_to_tsh >= 0),
  university varchar(160) NOT NULL,
  campus varchar(160) NOT NULL,
  availability varchar(80) NOT NULL,
  contact_method varchar(24) NOT NULL DEFAULT 'whatsapp' CHECK (contact_method IN ('whatsapp')),
  status service_listing_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_price_range_valid CHECK (price_to_tsh IS NULL OR price_from_tsh IS NULL OR price_to_tsh >= price_from_tsh),
  CONSTRAINT service_listings_provider_id_users_id_fk FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX service_listings_status_created_idx ON service_listings(status, created_at);
CREATE INDEX service_listings_category_campus_idx ON service_listings(category, campus);
CREATE INDEX service_listings_provider_idx ON service_listings(provider_id);
--> statement-breakpoint

CREATE TABLE service_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_listing_id uuid NOT NULL,
  object_key varchar(500) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_images_service_listing_id_service_listings_id_fk FOREIGN KEY (service_listing_id) REFERENCES public.service_listings(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT service_images_object_key_unique UNIQUE (object_key)
);
--> statement-breakpoint
CREATE INDEX service_images_listing_idx ON service_images(service_listing_id);
--> statement-breakpoint

ALTER TABLE reports ADD COLUMN housing_listing_id uuid;
ALTER TABLE reports ADD COLUMN roommate_request_id uuid;
ALTER TABLE reports ADD COLUMN study_material_id uuid;
ALTER TABLE reports ADD COLUMN campus_alert_id uuid;
ALTER TABLE reports ADD COLUMN service_listing_id uuid;
--> statement-breakpoint
ALTER TABLE reports ADD CONSTRAINT reports_housing_listing_id_housing_listings_id_fk FOREIGN KEY (housing_listing_id) REFERENCES public.housing_listings(id) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE reports ADD CONSTRAINT reports_roommate_request_id_roommate_requests_id_fk FOREIGN KEY (roommate_request_id) REFERENCES public.roommate_requests(id) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE reports ADD CONSTRAINT reports_study_material_id_study_materials_id_fk FOREIGN KEY (study_material_id) REFERENCES public.study_materials(id) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE reports ADD CONSTRAINT reports_campus_alert_id_campus_alerts_id_fk FOREIGN KEY (campus_alert_id) REFERENCES public.campus_alerts(id) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE reports ADD CONSTRAINT reports_service_listing_id_service_listings_id_fk FOREIGN KEY (service_listing_id) REFERENCES public.service_listings(id) ON DELETE SET NULL ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX reports_housing_listing_idx ON reports(housing_listing_id);
CREATE INDEX reports_roommate_request_idx ON reports(roommate_request_id);
CREATE INDEX reports_study_material_idx ON reports(study_material_id);
CREATE INDEX reports_campus_alert_idx ON reports(campus_alert_id);
CREATE INDEX reports_service_listing_idx ON reports(service_listing_id);
--> statement-breakpoint
CREATE UNIQUE INDEX reports_reporter_housing_unique ON reports(reporter_id, housing_listing_id) WHERE housing_listing_id IS NOT NULL;
CREATE UNIQUE INDEX reports_reporter_roommate_unique ON reports(reporter_id, roommate_request_id) WHERE roommate_request_id IS NOT NULL;
CREATE UNIQUE INDEX reports_reporter_material_unique ON reports(reporter_id, study_material_id) WHERE study_material_id IS NOT NULL;
CREATE UNIQUE INDEX reports_reporter_alert_unique ON reports(reporter_id, campus_alert_id) WHERE campus_alert_id IS NOT NULL;
CREATE UNIQUE INDEX reports_reporter_service_unique ON reports(reporter_id, service_listing_id) WHERE service_listing_id IS NOT NULL;
--> statement-breakpoint

-- The private study-material bucket must be separately configured from the public image bucket.
-- Application code refuses private file uploads/downloads when both resolve to the same bucket.
