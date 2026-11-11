-- Vehicle-specific spec fields for the Vehicles category (create/edit forms and listing pages).
ALTER TABLE public.auctions
    ADD COLUMN IF NOT EXISTS vehicle_year INTEGER,
    ADD COLUMN IF NOT EXISTS vehicle_mileage_km INTEGER,
    ADD COLUMN IF NOT EXISTS vehicle_transmission TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_fuel TEXT;
