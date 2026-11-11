-- Service listings (e.g. TJ Loans) show "On request" instead of a fixed price.
ALTER TABLE public.auctions
    ADD COLUMN IF NOT EXISTS price_on_request BOOLEAN NOT NULL DEFAULT false;
