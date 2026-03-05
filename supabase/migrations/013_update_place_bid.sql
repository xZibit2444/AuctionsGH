-- 013_update_place_bid.sql
-- Update the `place_bid` function to return data about the user who was just outbid,
-- so the Next.js backend can send them a Resend email notification.

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
  v_auction       auctions%ROWTYPE;
  v_bid_id        UUID;
  v_prev_bidder   RECORD;
  v_outbid_data   JSON;
BEGIN
  -- 1. Lock the auction row
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

  -- 2. Find the current highest bidder before we insert the new bid
  SELECT b.bidder_id, p.full_name, u.email INTO v_prev_bidder
    FROM bids b
    JOIN profiles p ON p.id = b.bidder_id
    JOIN auth.users u ON u.id = b.bidder_id
    WHERE b.auction_id = p_auction_id
    ORDER BY b.amount DESC
    LIMIT 1;

  -- 3. Insert the new winning bid
  INSERT INTO bids (auction_id, bidder_id, amount)
    VALUES (p_auction_id, p_bidder_id, p_amount)
    RETURNING id INTO v_bid_id;

  -- 4. Update the auction price
  UPDATE auctions SET
    current_price = p_amount,
    bid_count     = bid_count + 1,
    updated_at    = now()
  WHERE id = p_auction_id;

  -- 5. Create in-app notification if someone was outbid
  IF v_prev_bidder.bidder_id IS NOT NULL AND v_prev_bidder.bidder_id != p_bidder_id THEN
    INSERT INTO notifications (user_id, type, title, body, auction_id)
      VALUES (
        v_prev_bidder.bidder_id, 
        'outbid', 
        'You have been outbid!',
        format('Someone placed a higher bid of %s GHS on "%s"', p_amount, v_auction.title),
        p_auction_id
      );
      
    -- Build the outbid data block to return to the backend 
    v_outbid_data := json_build_object(
      'user_id', v_prev_bidder.bidder_id,
      'email', v_prev_bidder.email,
      'name', v_prev_bidder.full_name,
      'auction_title', v_auction.title
    );
  ELSE
    v_outbid_data := NULL;
  END IF;

  -- 6. Return success + outbid email data
  RETURN json_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'new_price', p_amount,
    'outbid_user', v_outbid_data
  );
END;
$$;
