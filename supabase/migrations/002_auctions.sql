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
  min_increment   NUMERIC(12,2) DEFAULT 50.00,
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
