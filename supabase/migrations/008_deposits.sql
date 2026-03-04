-- 008_deposits.sql
-- Bidding deposits — users must hold a deposit to place bids.
-- On ghost: deposit is forfeited to the seller.

CREATE TYPE deposit_status AS ENUM ('held', 'released', 'forfeited');

CREATE TABLE public.deposits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 50.00, -- fixed ₵50 deposit
  status       deposit_status NOT NULL DEFAULT 'held',
  order_id     UUID REFERENCES orders(id),           -- set when forfeited
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),

  -- Only one active (held) deposit per user at a time
  CONSTRAINT one_held_deposit_per_user UNIQUE (user_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_deposits_user   ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);

-- RLS
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deposit"
  ON deposits FOR SELECT
  USING (auth.uid() = user_id);

-- Only edge functions (service role) can insert/update deposits
-- No client-side INSERT or UPDATE policies intentionally.

-- Helper: check if a user has an active held deposit
CREATE OR REPLACE FUNCTION has_active_deposit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deposits
    WHERE user_id = p_user_id AND status = 'held'
  );
$$;
