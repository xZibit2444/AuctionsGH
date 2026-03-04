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
