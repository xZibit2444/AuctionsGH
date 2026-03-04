-- 004_images.sql
-- Auction image storage references

CREATE TABLE public.auction_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  position    INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_images_auction ON auction_images(auction_id);
