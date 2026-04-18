-- 20260418073000_offer_chat_threads.sql
-- Allow ongoing offer negotiation threads between a buyer and seller on an auction.

DROP INDEX IF EXISTS public.auction_offers_one_pending;

CREATE TABLE IF NOT EXISTS public.auction_offer_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_offer_messages_auction_buyer_created
    ON public.auction_offer_messages(auction_id, buyer_id, created_at);

CREATE INDEX IF NOT EXISTS idx_auction_offer_messages_seller
    ON public.auction_offer_messages(seller_id, created_at);

ALTER TABLE public.auction_offer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auction_offer_messages_select" ON public.auction_offer_messages;
CREATE POLICY "auction_offer_messages_select" ON public.auction_offer_messages
    FOR SELECT USING (
        auth.uid() = buyer_id OR auth.uid() = seller_id
    );

DROP POLICY IF EXISTS "auction_offer_messages_insert" ON public.auction_offer_messages;
CREATE POLICY "auction_offer_messages_insert" ON public.auction_offer_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND (auth.uid() = buyer_id OR auth.uid() = seller_id)
    );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'auction_offer_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_offer_messages;
    END IF;
END;
$$;
