ALTER TYPE point_event_type ADD VALUE IF NOT EXISTS 'notes_post';
ALTER TYPE point_event_type ADD VALUE IF NOT EXISTS 'answer_post';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS featured_days_credit integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS daily_point_claims (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_point_claims_user_date_unique UNIQUE(user_id, claim_date)
);

CREATE TABLE IF NOT EXISTS community_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_answers_post_created_idx
ON community_answers(post_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS community_answers_post_author_unique
ON community_answers(post_id, author_id);