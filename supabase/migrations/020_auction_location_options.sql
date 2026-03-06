-- 020_auction_location_options.sql
-- Add seller listing location + buyer-facing logistics options to auctions

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS listing_city TEXT NOT NULL DEFAULT 'Accra',
  ADD COLUMN IF NOT EXISTS meetup_area TEXT NOT NULL DEFAULT 'Accra Central',
  ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS inspection_available BOOLEAN NOT NULL DEFAULT TRUE;

-- Keep city constrained to Accra for current marketplace scope
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'auctions_listing_city_accra_check'
  ) THEN
    ALTER TABLE public.auctions
      ADD CONSTRAINT auctions_listing_city_accra_check
      CHECK (listing_city = 'Accra');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auctions_listing_city ON public.auctions(listing_city);
CREATE INDEX IF NOT EXISTS idx_auctions_meetup_area ON public.auctions(meetup_area);
