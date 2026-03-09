-- 036_trade_in_messages.sql
-- Private pre-sale trade-in messages between a buyer and a seller on an auction.

CREATE TABLE IF NOT EXISTS public.auction_trade_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offered_item TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auction_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_threads_auction_id
  ON public.auction_trade_threads(auction_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_threads_seller_id
  ON public.auction_trade_threads(seller_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_threads_buyer_id
  ON public.auction_trade_threads(buyer_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.auction_trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.auction_trade_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_messages_thread_id
  ON public.auction_trade_messages(thread_id, created_at ASC);

ALTER TABLE public.auction_trade_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_trade_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_threads_select" ON public.auction_trade_threads;
CREATE POLICY "trade_threads_select"
  ON public.auction_trade_threads FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "trade_messages_select" ON public.auction_trade_messages;
CREATE POLICY "trade_messages_select"
  ON public.auction_trade_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.auction_trade_threads t
      WHERE t.id = auction_trade_messages.thread_id
        AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
    )
  );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'auction_trade_threads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_trade_threads;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'auction_trade_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_trade_messages;
    END IF;
END $$;
