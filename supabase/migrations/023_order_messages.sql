-- 023_order_messages.sql
-- Real-time chat between buyer and seller on an order

CREATE TABLE IF NOT EXISTS public.order_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages(order_id, created_at);

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Only the buyer or seller of the related order may read messages
DROP POLICY IF EXISTS "order_messages_select" ON public.order_messages;
CREATE POLICY "order_messages_select" ON public.order_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_messages.order_id
              AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

-- Only the buyer or seller of the related order may insert (and only as themselves)
DROP POLICY IF EXISTS "order_messages_insert" ON public.order_messages;
CREATE POLICY "order_messages_insert" ON public.order_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_messages.order_id
              AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
    );

-- Enable Realtime replication for this table:
-- Go to Supabase Dashboard → Database → Replication (or Realtime → Tables)
-- and toggle ON the "order_messages" table.
-- Running ALTER PUBLICATION here can hang due to Supabase's realtime lock.
