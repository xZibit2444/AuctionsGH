-- 044_enable_ghana_regions.sql
-- Allow auctions to use Ghana-wide regions and locations instead of Accra only.

ALTER TABLE public.auctions
    DROP CONSTRAINT IF EXISTS auctions_listing_city_accra_check;

ALTER TABLE public.auctions
    ALTER COLUMN listing_city SET DEFAULT 'Greater Accra',
    ALTER COLUMN meetup_area SET DEFAULT 'Accra Central';
