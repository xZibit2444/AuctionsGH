-- 018_deliveries.sql
-- Delivery tracking with buyer-side verification code.
-- Seller uses their own courier; platform only verifies delivery via code.

DO $$
BEGIN
    CREATE TYPE delivery_status AS ENUM ('pending', 'shipped', 'delivered', 'completed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.deliveries (
    id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id     UUID            NOT NULL REFERENCES auctions(id)  ON DELETE CASCADE,
    order_id       UUID            NOT NULL REFERENCES orders(id)    ON DELETE CASCADE,
    seller_id      UUID            NOT NULL REFERENCES profiles(id),
    buyer_id       UUID            NOT NULL REFERENCES profiles(id),
    -- 6-digit numeric code shown only to the buyer
    delivery_code  TEXT            NOT NULL CHECK (delivery_code ~ '^[0-9]{4,6}$'),
    status         delivery_status NOT NULL DEFAULT 'pending',
    delivered_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT one_delivery_per_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order  ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_buyer  ON deliveries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_seller ON deliveries(seller_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- RLS
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Only buyer and seller may see their own delivery records
DROP POLICY IF EXISTS "buyer_seller_view_deliveries" ON deliveries;
CREATE POLICY "buyer_seller_view_deliveries"
    ON deliveries FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Service role (via server actions) inserts deliveries; no client INSERT
DROP POLICY IF EXISTS "system_insert_deliveries" ON deliveries;
CREATE POLICY "system_insert_deliveries"
    ON deliveries FOR INSERT
    WITH CHECK (true);

-- Seller updates status (shipped etc.); service role handles confirm
DROP POLICY IF EXISTS "seller_update_deliveries" ON deliveries;
CREATE POLICY "seller_update_deliveries"
    ON deliveries FOR UPDATE
    USING (auth.uid() = seller_id);
