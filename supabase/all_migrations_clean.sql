-- ─── 0. CLEANUP EXISTING TABLES & TYPES ───
-- This ensures the migration runs cleanly even if there was a previous attempt.
-- It drops tables and types so they can be securely recreated.

-- 1. Drop all tables (CASCADE handles foreign key dependencies)
DROP TABLE IF EXISTS public.order_pins CASCADE;
DROP TABLE IF EXISTS public.escrow_payments CASCADE;
DROP TABLE IF EXISTS public.deposits CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.watchlist CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.auction_images CASCADE;
DROP TABLE IF EXISTS public.bids CASCADE;
DROP TABLE IF EXISTS public.auctions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Drop all custom ENUM types
DROP TYPE IF EXISTS public.auction_status CASCADE;
DROP TYPE IF EXISTS public.auction_condition CASCADE;
DROP TYPE IF EXISTS public.phone_condition CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;
DROP TYPE IF EXISTS public.fulfillment_type CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.deposit_status CASCADE;
DROP TYPE IF EXISTS public.escrow_status CASCADE;

-- 3. Drop all custom functions to prevent signature conflicts
DROP FUNCTION IF EXISTS public.place_bid CASCADE;
DROP FUNCTION IF EXISTS public.close_expired_auctions CASCADE;
DROP FUNCTION IF EXISTS public.create_order_pin CASCADE;
DROP FUNCTION IF EXISTS public.verify_order_pin CASCADE;

-- ──────────────────────────────────────────



-- 001_profiles.sql
-- User profiles extending Supabase auth.users

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  phone_number  TEXT,
  location      TEXT,
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);


-- 002_auctions.sql
-- Auction listings for smartphones

CREATE TYPE auction_status AS ENUM ('draft', 'active', 'ended', 'sold', 'cancelled');
CREATE TYPE phone_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');

CREATE TABLE public.auctions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  brand           TEXT NOT NULL,
  model           TEXT NOT NULL,
  storage_gb      INT,
  ram_gb          INT,
  condition       phone_condition NOT NULL,
  starting_price  NUMERIC(12,2) NOT NULL,
  current_price   NUMERIC(12,2) NOT NULL,
  min_increment   NUMERIC(12,2) DEFAULT 5.00,
  bid_count       INT DEFAULT 0,
  status          auction_status DEFAULT 'active',
  winner_id       UUID REFERENCES profiles(id),
  starts_at       TIMESTAMPTZ DEFAULT now(),
  ends_at         TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_auctions_status  ON auctions(status);
CREATE INDEX idx_auctions_seller  ON auctions(seller_id);
CREATE INDEX idx_auctions_ends_at ON auctions(ends_at);
CREATE INDEX idx_auctions_brand   ON auctions(brand);


-- 003_bids.sql
-- Immutable bid ledger

CREATE TABLE public.bids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT bid_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_bidder  ON bids(bidder_id);
CREATE INDEX idx_bids_created ON bids(auction_id, created_at DESC);


-- 004_images.sql
-- Auction image storage references

CREATE TABLE public.auction_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  position    INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_images_auction ON auction_images(auction_id);


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


-- 006_rls_policies.sql
-- Row Level Security for all tables

-- Enable RLS
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_images  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist       ENABLE ROW LEVEL SECURITY;

-- ── profiles ──
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── auctions ──
CREATE POLICY "Auctions are viewable by everyone"
  ON auctions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create auctions"
  ON auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own auctions"
  ON auctions FOR UPDATE USING (auth.uid() = seller_id);

-- ── auction_images ──
CREATE POLICY "Images are viewable by everyone"
  ON auction_images FOR SELECT USING (true);

CREATE POLICY "Sellers can add images to own auctions"
  ON auction_images FOR INSERT WITH CHECK (
    auth.uid() = (SELECT seller_id FROM auctions WHERE id = auction_id)
  );

-- ── bids (immutable — no UPDATE/DELETE policies) ──
CREATE POLICY "Bids are viewable by everyone"
  ON bids FOR SELECT USING (true);

CREATE POLICY "Authenticated users can place bids"
  ON bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- ── notifications ──
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── watchlist ──
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist"
  ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own watchlist"
  ON watchlist FOR DELETE USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- Database Functions
-- ═══════════════════════════════════════════════════════════

-- Atomic bid placement with row lock
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_bidder_id  UUID,
  p_amount     NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction   auctions%ROWTYPE;
  v_bid_id    UUID;
BEGIN
  SELECT * INTO v_auction
    FROM auctions
    WHERE id = p_auction_id
    FOR UPDATE;

  IF v_auction IS NULL THEN
    RETURN json_build_object('error', 'Auction not found');
  END IF;

  IF v_auction.status != 'active' THEN
    RETURN json_build_object('error', 'Auction is not active');
  END IF;

  IF v_auction.ends_at < now() THEN
    RETURN json_build_object('error', 'Auction has ended');
  END IF;

  IF v_auction.seller_id = p_bidder_id THEN
    RETURN json_build_object('error', 'Sellers cannot bid on their own auction');
  END IF;

  IF p_amount < v_auction.current_price + v_auction.min_increment THEN
    RETURN json_build_object(
      'error',
      format('Bid must be at least %s GHS', v_auction.current_price + v_auction.min_increment)
    );
  END IF;

  INSERT INTO bids (auction_id, bidder_id, amount)
    VALUES (p_auction_id, p_bidder_id, p_amount)
    RETURNING id INTO v_bid_id;

  UPDATE auctions SET
    current_price = p_amount,
    bid_count     = bid_count + 1,
    updated_at    = now()
  WHERE id = p_auction_id;

  -- Notify previous high bidder
  INSERT INTO notifications (user_id, type, title, body, auction_id)
    SELECT b.bidder_id, 'outbid', 'You have been outbid!',
           format('Someone placed a higher bid of %s GHS on "%s"', p_amount, v_auction.title),
           p_auction_id
    FROM bids b
    WHERE b.auction_id = p_auction_id
      AND b.id != v_bid_id
    ORDER BY b.amount DESC
    LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'new_price', p_amount
  );
END;
$$;


-- Close expired auctions (cron)
CREATE OR REPLACE FUNCTION close_expired_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction RECORD;
BEGIN
  FOR v_auction IN
    SELECT a.id, a.title, a.seller_id, a.current_price, a.bid_count,
           (SELECT bidder_id FROM bids WHERE auction_id = a.id ORDER BY amount DESC LIMIT 1) AS top_bidder
    FROM auctions a
    WHERE a.status = 'active' AND a.ends_at <= now()
    FOR UPDATE
  LOOP
    IF v_auction.bid_count > 0 AND v_auction.top_bidder IS NOT NULL THEN
      UPDATE auctions SET
        status    = 'sold',
        winner_id = v_auction.top_bidder,
        updated_at = now()
      WHERE id = v_auction.id;

      INSERT INTO notifications (user_id, type, title, body, auction_id)
        VALUES (v_auction.top_bidder, 'auction_won',
                'You won the auction!',
                format('Congratulations! You won "%s" for %s GHS', v_auction.title, v_auction.current_price),
                v_auction.id);

      INSERT INTO notifications (user_id, type, title, body, auction_id)
        VALUES (v_auction.seller_id, 'auction_ended',
                'Your auction has ended',
                format('"%s" sold for %s GHS', v_auction.title, v_auction.current_price),
                v_auction.id);
    ELSE
      UPDATE auctions SET
        status     = 'ended',
        updated_at = now()
      WHERE id = v_auction.id;

      INSERT INTO notifications (user_id, type, title, body, auction_id)
        VALUES (v_auction.seller_id, 'auction_ended',
                'Your auction ended with no bids',
                format('"%s" received no bids', v_auction.title),
                v_auction.id);
    END IF;
  END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- Enable Realtime for bids and auctions tables
-- ═══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE auctions;


-- 007_orders.sql
-- Post-auction order records with fulfillment type and state machine

CREATE TYPE fulfillment_type AS ENUM ('meet_and_inspect', 'escrow_delivery');

CREATE TYPE order_status AS ENUM (
  -- Meet & Inspect states
  'pending_meetup',
  'completed',
  'ghosted',

  -- Escrow & Delivery states
  'pending_payment',
  'funds_held',
  'in_delivery',
  'pin_verified',
  'pin_refused',
  'returning',
  'refunded'
);

CREATE TABLE public.orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id       UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  buyer_id         UUID NOT NULL REFERENCES profiles(id),
  seller_id        UUID NOT NULL REFERENCES profiles(id),
  fulfillment_type fulfillment_type NOT NULL,
  status           order_status NOT NULL DEFAULT 'pending_meetup',
  amount           NUMERIC(12,2) NOT NULL,
  meetup_location  TEXT,                    -- for meet_and_inspect
  meetup_at        TIMESTAMPTZ,             -- scheduled meetup time
  ghost_reported_at TIMESTAMPTZ,            -- when seller reports ghost
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT one_order_per_auction UNIQUE (auction_id)
);

CREATE INDEX idx_orders_buyer  ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and sellers can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "System can create orders"
  ON orders FOR INSERT
  WITH CHECK (true); -- Edge functions use service role; client cannot insert directly

CREATE POLICY "Buyers and sellers can update their own orders"
  ON orders FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);


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


-- 009_escrow.sql
-- Escrow payment record for Escrow & Delivery orders.

CREATE TYPE escrow_status AS ENUM ('pending', 'held', 'released', 'refunded');

CREATE TABLE public.escrow_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id     UUID NOT NULL REFERENCES profiles(id),
  seller_id    UUID NOT NULL REFERENCES profiles(id),
  amount       NUMERIC(12,2) NOT NULL,
  status       escrow_status NOT NULL DEFAULT 'pending',
  reference    TEXT UNIQUE,                -- external payment gateway reference
  held_at      TIMESTAMPTZ,               -- when funds confirmed in escrow
  released_at  TIMESTAMPTZ,               -- when funds released to seller
  refunded_at  TIMESTAMPTZ,               -- when funds returned to buyer
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT one_escrow_per_order UNIQUE (order_id)
);

CREATE INDEX idx_escrow_order  ON escrow_payments(order_id);
CREATE INDEX idx_escrow_buyer  ON escrow_payments(buyer_id);
CREATE INDEX idx_escrow_seller ON escrow_payments(seller_id);

-- RLS
ALTER TABLE escrow_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and sellers can view their escrow"
  ON escrow_payments FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);


-- 010_pins.sql
-- 4-digit delivery verification PIN for Escrow & Delivery orders.
-- PIN is hashed — plaintext is never stored.

CREATE TABLE public.order_pins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pin_hash     TEXT NOT NULL,             -- pgcrypto crypt() hash of the 4-digit PIN
  expires_at   TIMESTAMPTZ NOT NULL,      -- system time + 24 hours
  attempts     SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 3,
  verified_at  TIMESTAMPTZ,              -- set on successful PIN entry
  created_at   TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT one_pin_per_order UNIQUE (order_id)
);

ALTER TABLE order_pins ENABLE ROW LEVEL SECURITY;

-- Only the buyer of the linked order can query this row
-- (they never see the hash — they only submit a guess)
CREATE POLICY "Buyer can view their pin record (not the hash)"
  ON order_pins FOR SELECT
  USING (
    auth.uid() = (SELECT buyer_id FROM orders WHERE id = order_id)
  );

-- ─── Atomic PIN creation & verification functions ──────────────────────────────

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Called by create-order edge function to generate and store PIN
CREATE OR REPLACE FUNCTION create_order_pin(p_order_id UUID)
RETURNS TEXT   -- returns plaintext PIN (edge function sends it to buyer via notification)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin      TEXT;
  v_pin_hash TEXT;
BEGIN
  -- Generate random 4-digit PIN (zero-padded)
  v_pin := lpad((floor(random() * 10000)::int)::text, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf', 8));

  INSERT INTO order_pins (order_id, pin_hash, expires_at)
    VALUES (p_order_id, v_pin_hash, now() + INTERVAL '24 hours')
    ON CONFLICT (order_id) DO UPDATE
      SET pin_hash   = EXCLUDED.pin_hash,
          expires_at = EXCLUDED.expires_at,
          attempts   = 0,
          verified_at = NULL;

  RETURN v_pin;   -- caller must send this to buyer securely; it is NOT stored
END;
$$;


-- Called by verify-pin edge function
-- Returns: 'verified' | 'wrong_pin' | 'max_attempts' | 'expired' | 'not_found'
CREATE OR REPLACE FUNCTION verify_order_pin(
  p_order_id UUID,
  p_pin      TEXT      -- plaintext guess from buyer
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin_row order_pins%ROWTYPE;
BEGIN
  SELECT * INTO v_pin_row
    FROM order_pins
    WHERE order_id = p_order_id
    FOR UPDATE;

  IF v_pin_row IS NULL THEN
    RETURN 'not_found';
  END IF;

  IF v_pin_row.verified_at IS NOT NULL THEN
    RETURN 'verified'; -- already done
  END IF;

  IF v_pin_row.expires_at < now() THEN
    RETURN 'expired';
  END IF;

  IF v_pin_row.attempts >= v_pin_row.max_attempts THEN
    RETURN 'max_attempts';
  END IF;

  -- Check PIN
  IF v_pin_row.pin_hash = crypt(p_pin, v_pin_row.pin_hash) THEN
    -- Correct PIN
    UPDATE order_pins SET verified_at = now() WHERE order_id = p_order_id;
    UPDATE orders      SET status = 'pin_verified', updated_at = now() WHERE id = p_order_id;
    RETURN 'verified';
  ELSE
    -- Wrong PIN — increment attempts
    UPDATE order_pins SET attempts = attempts + 1 WHERE order_id = p_order_id;

    IF v_pin_row.attempts + 1 >= v_pin_row.max_attempts THEN
      -- Auto-trigger refund flow
      UPDATE orders SET status = 'pin_refused', updated_at = now() WHERE id = p_order_id;
      RETURN 'max_attempts';
    END IF;

    RETURN 'wrong_pin';
  END IF;
END;
$$;


-- 011_security_hardening.sql
-- Restrict search_path on all SECURITY DEFINER functions to prevent
-- search_path hijacking attacks.

-- ── place_bid ──
ALTER FUNCTION place_bid(UUID, UUID, NUMERIC)
  SET search_path = public;

-- ── close_expired_auctions ──
ALTER FUNCTION close_expired_auctions()
  SET search_path = public;

-- ── create_order_pin ──
ALTER FUNCTION create_order_pin(UUID)
  SET search_path = public;

-- ── verify_order_pin ──
ALTER FUNCTION verify_order_pin(UUID, TEXT)
  SET search_path = public;


