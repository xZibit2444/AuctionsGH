-- Counter-offers: a seller can answer a pending offer with a counter amount;
-- the buyer then accepts or declines the counter.
-- counter_amount holds the seller's proposed price while status = 'countered';
-- when the buyer accepts, status becomes 'accepted' and the agreed price is
-- COALESCE(counter_amount, amount).

ALTER TABLE public.auction_offers
    DROP CONSTRAINT IF EXISTS auction_offers_status_check;

ALTER TABLE public.auction_offers
    ADD CONSTRAINT auction_offers_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'countered'));

ALTER TABLE public.auction_offers
    ADD COLUMN IF NOT EXISTS counter_amount NUMERIC(12,2) CHECK (counter_amount > 0);
