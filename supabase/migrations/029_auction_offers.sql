-- 029_auction_offers.sql
-- Pre-auction offer system: buyers send a fixed-price offer to sellers
-- Sellers can only accept or decline (no custom replies)

CREATE TABLE IF NOT EXISTS auction_offers (
    id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id  UUID         NOT NULL REFERENCES auctions(id)  ON DELETE CASCADE,
    buyer_id    UUID         NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
    seller_id   UUID         NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status      TEXT         NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast lookups
CREATE INDEX IF NOT EXISTS auction_offers_auction_idx ON auction_offers(auction_id, status);
CREATE INDEX IF NOT EXISTS auction_offers_buyer_idx   ON auction_offers(buyer_id);
CREATE INDEX IF NOT EXISTS auction_offers_seller_idx  ON auction_offers(seller_id);

-- Only one PENDING offer per buyer per auction at a time
CREATE UNIQUE INDEX IF NOT EXISTS auction_offers_one_pending
    ON auction_offers(auction_id, buyer_id)
    WHERE status = 'pending';

-- ── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE auction_offers ENABLE ROW LEVEL SECURITY;

-- Buyers can create offers (buyer_id must match their own UUID)
CREATE POLICY "Buyers can create offers"
    ON auction_offers FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

-- Both buyer AND seller can read offers they are party to
CREATE POLICY "Parties can view their offers"
    ON auction_offers FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Sellers can update the status (accept / decline) on their own offers
CREATE POLICY "Seller can respond to offers"
    ON auction_offers FOR UPDATE
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

-- ── Realtime ───────────────────────────────────────────────────────────────
-- Allow both buyer and seller to receive live updates on this table
ALTER PUBLICATION supabase_realtime ADD TABLE auction_offers;
