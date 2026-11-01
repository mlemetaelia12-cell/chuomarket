CREATE TABLE IF NOT EXISTS api_rate_limits (
  key varchar(200) PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  kind varchar(40) NOT NULL,
  message varchar(240) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT user_notifications_subscription_kind_unique
    UNIQUE(subscription_id, kind)
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
ON user_notifications(user_id, created_at);