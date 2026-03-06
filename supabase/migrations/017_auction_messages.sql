-- 017_auction_messages.sql
-- Real-time chat between buyer (winner) and seller during checkout/order

CREATE TABLE IF NOT EXISTS messages (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID        NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    sender_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_auction_id_idx  ON messages(auction_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx  ON messages(created_at);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Only the auction winner (buyer) and seller may read messages
CREATE POLICY "buyer_seller_select_messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auctions a
            WHERE a.id = messages.auction_id
              AND (a.winner_id = auth.uid() OR a.seller_id = auth.uid())
        )
    );

-- Only the buyer or seller may insert; sender_id must equal themselves
CREATE POLICY "buyer_seller_insert_messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM auctions a
            WHERE a.id = messages.auction_id
              AND (a.winner_id = auth.uid() OR a.seller_id = auth.uid())
        )
    );
