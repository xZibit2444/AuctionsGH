-- 20261111_seller_whatsapp_toggle.sql
-- Sellers can opt in to a WhatsApp button on their listings.
-- When enabled, listing pages show a button that opens the buyer's WhatsApp
-- with a prewritten message about the listing, addressed to the seller's
-- saved phone number. Default off so no seller's number is shown without consent.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false;
