-- Per-listing switch for Buy now. Existing listings keep Buy now (default true).
-- Sourced listings that need availability confirmed first are set to false.
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS allow_buy_now boolean NOT NULL DEFAULT true;
