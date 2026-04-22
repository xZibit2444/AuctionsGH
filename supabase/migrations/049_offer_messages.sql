-- 049_offer_messages.sql
-- Free-form chat between buyer and seller within an offer thread.
-- One thread per (auction_id, buyer_id) pair.

CREATE TABLE IF NOT EXISTS auction_offer_messages (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id  UUID        NOT NULL REFERENCES auctions(id)  ON DELETE CASCADE,
    buyer_id    UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
    seller_id   UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
    sender_id   UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
    body        TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS offer_messages_thread_idx
    ON auction_offer_messages(auction_id, buyer_id, created_at);

ALTER TABLE auction_offer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parties_read_offer_messages" ON auction_offer_messages;
DROP POLICY IF EXISTS "parties_send_offer_messages" ON auction_offer_messages;

-- Both buyer and seller can read messages in their own thread
CREATE POLICY "parties_read_offer_messages"
    ON auction_offer_messages FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Buyer or seller can insert; sender_id must match the caller
CREATE POLICY "parties_send_offer_messages"
    ON auction_offer_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND (auth.uid() = buyer_id OR auth.uid() = seller_id)
    );

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'auction_offer_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE auction_offer_messages;
    END IF;
END $$;
