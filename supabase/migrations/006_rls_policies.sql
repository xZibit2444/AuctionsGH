-- 006_rls_policies.sql
-- Row Level Security for all tables

-- Enable RLS
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_images  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist       ENABLE ROW LEVEL SECURITY;

-- ── profiles ──
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── auctions ──
CREATE POLICY "Auctions are viewable by everyone"
  ON auctions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create auctions"
  ON auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own auctions"
  ON auctions FOR UPDATE USING (auth.uid() = seller_id);

-- ── auction_images ──
CREATE POLICY "Images are viewable by everyone"
  ON auction_images FOR SELECT USING (true);

CREATE POLICY "Sellers can add images to own auctions"
  ON auction_images FOR INSERT WITH CHECK (
    auth.uid() = (SELECT seller_id FROM auctions WHERE id = auction_id)
  );

-- ── bids (immutable — no UPDATE/DELETE policies) ──
CREATE POLICY "Bids are viewable by everyone"
  ON bids FOR SELECT USING (true);

CREATE POLICY "Authenticated users can place bids"
  ON bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- ── notifications ──
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── watchlist ──
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist"
  ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own watchlist"
  ON watchlist FOR DELETE USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- Database Functions
-- ═══════════════════════════════════════════════════════════

-- Atomic bid placement with row lock
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_bidder_id  UUID,
  p_amount     NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction   auctions%ROWTYPE;
  v_bid_id    UUID;
BEGIN
  SELECT * INTO v_auction
    FROM auctions
    WHERE id = p_auction_id
    FOR UPDATE;

  IF v_auction IS NULL THEN
    RETURN json_build_object('error', 'Auction not found');
  END IF;

  IF v_auction.status != 'active' THEN
    RETURN json_build_object('error', 'Auction is not active');
  END IF;

  IF v_auction.ends_at < now() THEN
    RETURN json_build_object('error', 'Auction has ended');
  END IF;

  IF v_auction.seller_id = p_bidder_id THEN
    RETURN json_build_object('error', 'Sellers cannot bid on their own auction');
  END IF;

  IF p_amount < v_auction.current_price + v_auction.min_increment THEN
    RETURN json_build_object(
      'error',
      format('Bid must be at least %s GHS', v_auction.current_price + v_auction.min_increment)
    );
  END IF;

  INSERT INTO bids (auction_id, bidder_id, amount)
    VALUES (p_auction_id, p_bidder_id, p_amount)
    RETURNING id INTO v_bid_id;

  UPDATE auctions SET
    current_price = p_amount,
    bid_count     = bid_count + 1,
    updated_at    = now()
  WHERE id = p_auction_id;

  -- Notify previous high bidder
  INSERT INTO notifications (user_id, type, title, body, auction_id)
    SELECT b.bidder_id, 'outbid', 'You have been outbid!',
           format('Someone placed a higher bid of %s GHS on "%s"', p_amount, v_auction.title),
           p_auction_id
    FROM bids b
    WHERE b.auction_id = p_auction_id
      AND b.id != v_bid_id
    ORDER BY b.amount DESC
    LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'new_price', p_amount
  );
END;
$$;


-- Close expired auctions (cron)
CREATE OR REPLACE FUNCTION close_expired_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auction RECORD;
BEGIN
  FOR v_auction IN
    SELECT a.id, a.title, a.seller_id, a.current_price, a.bid_count,
           (SELECT bidder_id FROM bids WHERE auction_id = a.id ORDER BY amount DESC LIMIT 1) AS top_bidder
    FROM auctions a
    WHERE a.status = 'active' AND a.ends_at <= now()
    FOR UPDATE
  LOOP
    IF v_auction.bid_count > 0 AND v_auction.top_bidder IS NOT NULL THEN
      UPDATE auctions SET
        status    = 'sold',
        winner_id = v_auction.top_bidder,
        updated_at = now()
      WHERE id = v_auction.id;

      INSERT INTO notifications (user_id, type, title, body, auction_id)
        VALUES (v_auction.top_bidder, 'auction_won',
                'You won the auction!',
                format('Congratulations! You won "%s" for %s GHS', v_auction.title, v_auction.current_price),
                v_auction.id);

      INSERT INTO notifications (user_id, type, title, body, auction_id)
        VALUES (v_auction.seller_id, 'auction_ended',
                'Your auction has ended',
                format('"%s" sold for %s GHS', v_auction.title, v_auction.current_price),
                v_auction.id);
    ELSE
      UPDATE auctions SET
        status     = 'ended',
        updated_at = now()
      WHERE id = v_auction.id;

      INSERT INTO notifications (user_id, type, title, body, auction_id)
        VALUES (v_auction.seller_id, 'auction_ended',
                'Your auction ended with no bids',
                format('"%s" received no bids', v_auction.title),
                v_auction.id);
    END IF;
  END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- Enable Realtime for bids and auctions tables
-- ═══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE auctions;
