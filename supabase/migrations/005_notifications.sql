-- 005_notifications.sql
-- In-app notifications

CREATE TYPE notification_type AS ENUM ('outbid', 'auction_won', 'auction_ended', 'new_bid');

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  auction_id  UUID REFERENCES auctions(id),
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Watchlist table
CREATE TABLE public.watchlist (
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  auction_id  UUID REFERENCES auctions(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, auction_id)
);
