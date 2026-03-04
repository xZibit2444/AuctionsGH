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
