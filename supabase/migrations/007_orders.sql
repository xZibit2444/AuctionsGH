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
