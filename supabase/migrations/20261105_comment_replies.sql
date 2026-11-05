-- Threaded replies on listing comments (one level: replies attach to a top-level comment).
ALTER TABLE public.auction_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.auction_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_auction_comments_parent_id
  ON public.auction_comments(parent_id);
