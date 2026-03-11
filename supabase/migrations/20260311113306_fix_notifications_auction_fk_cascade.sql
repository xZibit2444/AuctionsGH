-- Ensure notifications tied to an auction are removed when that auction is deleted.
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_auction_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_auction_id_fkey
FOREIGN KEY (auction_id)
REFERENCES public.auctions(id)
ON DELETE CASCADE;
