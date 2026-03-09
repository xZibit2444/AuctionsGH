-- 037_auction_comments.sql
-- Public real-time comments on auction listings.

CREATE TABLE IF NOT EXISTS public.auction_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_comments_auction_id
  ON public.auction_comments(auction_id, created_at ASC);

ALTER TABLE public.auction_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction_comments_select" ON public.auction_comments;
CREATE POLICY "auction_comments_select"
  ON public.auction_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "auction_comments_insert" ON public.auction_comments;
CREATE POLICY "auction_comments_insert"
  ON public.auction_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'auction_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_comments;
    END IF;
END $$;
