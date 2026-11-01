ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS post_status varchar(20) NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS lost_found_type varchar(10),
  ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS community_post_id uuid
  REFERENCES community_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reports_community_post_idx
ON reports(community_post_id);