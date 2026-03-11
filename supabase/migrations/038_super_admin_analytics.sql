-- 038_super_admin_analytics.sql
-- Superior admin analytics helpers and dashboard RPC.

CREATE OR REPLACE VIEW public.super_admin_daily_marketplace_metrics AS
WITH days AS (
  SELECT generate_series(current_date - interval '179 days', current_date, interval '1 day')::date AS day
)
SELECT
  days.day,
  COALESCE((
    SELECT COUNT(*)
    FROM public.auctions a
    WHERE a.created_at::date = days.day
  ), 0) AS auctions_created,
  COALESCE((
    SELECT COUNT(*)
    FROM public.auctions a
    WHERE a.created_at::date = days.day
      AND a.status = 'sold'
  ), 0) AS auctions_sold,
  COALESCE((
    SELECT COUNT(*)
    FROM public.bids b
    WHERE b.created_at::date = days.day
  ), 0) AS bid_count,
  COALESCE((
    SELECT COUNT(*)
    FROM public.orders o
    WHERE o.created_at::date = days.day
  ), 0) AS orders_created,
  COALESCE((
    SELECT COUNT(*)
    FROM public.orders o
    WHERE o.created_at::date = days.day
      AND o.status IN ('completed', 'pin_verified')
  ), 0) AS orders_completed,
  COALESCE((
    SELECT SUM(o.amount)
    FROM public.orders o
    WHERE o.created_at::date = days.day
      AND o.status IN ('completed', 'pin_verified')
  ), 0)::numeric(12,2) AS gmv_completed,
  COALESCE((
    SELECT COUNT(*)
    FROM public.auction_comments c
    WHERE c.created_at::date = days.day
  ), 0) AS comment_count,
  COALESCE((
    SELECT COUNT(*)
    FROM public.auction_offers f
    WHERE f.created_at::date = days.day
  ), 0) AS offer_count,
  COALESCE((
    SELECT COUNT(*)
    FROM public.saved_auctions s
    WHERE s.created_at::date = days.day
  ), 0) AS saved_count
FROM days;

CREATE OR REPLACE VIEW public.super_admin_seller_snapshot AS
SELECT
  p.id AS seller_id,
  p.username,
  p.full_name,
  p.location,
  p.is_verified,
  COUNT(a.id) AS listings_total,
  COUNT(a.id) FILTER (WHERE a.status = 'active') AS listings_active,
  COUNT(a.id) FILTER (WHERE a.status = 'sold') AS listings_sold,
  COALESCE((
    SELECT COUNT(*)
    FROM public.orders o
    WHERE o.seller_id = p.id
      AND o.status IN ('completed', 'pin_verified')
  ), 0) AS completed_orders,
  COALESCE((
    SELECT SUM(o.amount)
    FROM public.orders o
    WHERE o.seller_id = p.id
      AND o.status IN ('completed', 'pin_verified')
  ), 0)::numeric(12,2) AS gmv,
  COALESCE((
    SELECT ROUND(AVG(r.rating)::numeric, 1)
    FROM public.user_reviews r
    WHERE r.reviewee_id = p.id
  ), 0)::numeric(4,1) AS avg_rating,
  COALESCE((
    SELECT COUNT(*)
    FROM public.user_reviews r
    WHERE r.reviewee_id = p.id
  ), 0) AS review_count,
  COALESCE((
    SELECT COUNT(*)
    FROM public.bids b
    JOIN public.auctions ba ON ba.id = b.auction_id
    WHERE ba.seller_id = p.id
  ), 0) AS total_bids,
  COALESCE((
    SELECT COUNT(*)
    FROM public.auction_offers f
    WHERE f.seller_id = p.id
  ), 0) AS offer_count,
  COALESCE((
    SELECT COUNT(*)
    FROM public.auction_comments c
    JOIN public.auctions ca ON ca.id = c.auction_id
    WHERE ca.seller_id = p.id
  ), 0) AS comment_count,
  COALESCE((
    SELECT COUNT(*)
    FROM public.saved_auctions s
    JOIN public.auctions sa ON sa.id = s.auction_id
    WHERE sa.seller_id = p.id
  ), 0) AS saved_count,
  MAX(a.created_at) AS last_listing_at
FROM public.profiles p
LEFT JOIN public.auctions a ON a.seller_id = p.id
WHERE p.is_admin = true
GROUP BY p.id, p.username, p.full_name, p.location, p.is_verified;

CREATE OR REPLACE FUNCTION public.get_super_admin_dashboard(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_seller_id UUID DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_fulfillment_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE := COALESCE(p_start_date, current_date - 29);
  v_end_date DATE := COALESCE(p_end_date, current_date);
BEGIN
  RETURN (
    WITH filtered_auctions AS (
      SELECT a.*
      FROM public.auctions a
      WHERE a.created_at::date BETWEEN v_start_date AND v_end_date
        AND (p_seller_id IS NULL OR a.seller_id = p_seller_id)
        AND (p_city IS NULL OR a.listing_city = p_city)
    ),
    filtered_orders AS (
      SELECT o.*, a.title AS auction_title, a.listing_city
      FROM public.orders o
      JOIN public.auctions a ON a.id = o.auction_id
      WHERE o.created_at::date BETWEEN v_start_date AND v_end_date
        AND (p_seller_id IS NULL OR o.seller_id = p_seller_id)
        AND (p_city IS NULL OR a.listing_city = p_city)
        AND (p_fulfillment_type IS NULL OR o.fulfillment_type::text = p_fulfillment_type)
        AND (p_status IS NULL OR o.status::text = p_status)
    ),
    filtered_bids AS (
      SELECT b.*
      FROM public.bids b
      JOIN public.auctions a ON a.id = b.auction_id
      WHERE b.created_at::date BETWEEN v_start_date AND v_end_date
        AND (p_seller_id IS NULL OR a.seller_id = p_seller_id)
        AND (p_city IS NULL OR a.listing_city = p_city)
    ),
    filtered_comments AS (
      SELECT c.*
      FROM public.auction_comments c
      JOIN public.auctions a ON a.id = c.auction_id
      WHERE c.created_at::date BETWEEN v_start_date AND v_end_date
        AND (p_seller_id IS NULL OR a.seller_id = p_seller_id)
        AND (p_city IS NULL OR a.listing_city = p_city)
    ),
    filtered_offers AS (
      SELECT f.*
      FROM public.auction_offers f
      JOIN public.auctions a ON a.id = f.auction_id
      WHERE f.created_at::date BETWEEN v_start_date AND v_end_date
        AND (p_seller_id IS NULL OR a.seller_id = p_seller_id)
        AND (p_city IS NULL OR a.listing_city = p_city)
    ),
    filtered_saves AS (
      SELECT s.*
      FROM public.saved_auctions s
      JOIN public.auctions a ON a.id = s.auction_id
      WHERE s.created_at::date BETWEEN v_start_date AND v_end_date
        AND (p_seller_id IS NULL OR a.seller_id = p_seller_id)
        AND (p_city IS NULL OR a.listing_city = p_city)
    ),
    filtered_deliveries AS (
      SELECT d.*
      FROM public.deliveries d
      JOIN public.orders o ON o.id = d.order_id
      JOIN public.auctions a ON a.id = d.auction_id
      WHERE d.created_at::date BETWEEN v_start_date AND v_end_date
        AND (p_seller_id IS NULL OR d.seller_id = p_seller_id)
        AND (p_city IS NULL OR a.listing_city = p_city)
        AND (p_fulfillment_type IS NULL OR o.fulfillment_type::text = p_fulfillment_type)
    ),
    filtered_reviews AS (
      SELECT r.*
      FROM public.user_reviews r
      WHERE r.created_at::date BETWEEN v_start_date AND v_end_date
    ),
    filtered_messages AS (
      SELECT m.*
      FROM public.order_messages m
      JOIN public.orders o ON o.id = m.order_id
      JOIN public.auctions a ON a.id = o.auction_id
      WHERE m.created_at::date BETWEEN v_start_date AND v_end_date
        AND (p_seller_id IS NULL OR o.seller_id = p_seller_id)
        AND (p_city IS NULL OR a.listing_city = p_city)
        AND (p_fulfillment_type IS NULL OR o.fulfillment_type::text = p_fulfillment_type)
    ),
    filtered_applications AS (
      SELECT sa.*
      FROM public.seller_applications sa
      WHERE sa.created_at::date BETWEEN v_start_date AND v_end_date
    ),
    filtered_days AS (
      SELECT generate_series(v_start_date, v_end_date, interval '1 day')::date AS day
    )
    SELECT jsonb_build_object(
      'kpis', jsonb_build_object(
        'gmv', COALESCE((SELECT SUM(amount) FROM filtered_orders WHERE status IN ('completed', 'pin_verified')), 0)::numeric(12,2),
        'completed_orders', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status IN ('completed', 'pin_verified')), 0),
        'live_auctions', COALESCE((SELECT COUNT(*) FROM filtered_auctions WHERE status = 'active'), 0),
        'sold_auctions', COALESCE((SELECT COUNT(*) FROM filtered_auctions WHERE status = 'sold'), 0),
        'sell_through_rate', COALESCE((
          SELECT ROUND(
            (
              COUNT(*) FILTER (WHERE status = 'sold')::numeric
              / NULLIF(COUNT(*) FILTER (WHERE status IN ('ended', 'sold')), 0)
            ) * 100, 1
          )
          FROM filtered_auctions
        ), 0),
        'avg_final_price', COALESCE((SELECT ROUND(AVG(amount)::numeric, 2) FROM filtered_orders WHERE status IN ('completed', 'pin_verified')), 0)::numeric(12,2),
        'pending_applications', COALESCE((SELECT COUNT(*) FROM filtered_applications WHERE status = 'pending'), 0),
        'delivery_issues', COALESCE((SELECT COUNT(*) FROM filtered_deliveries WHERE status IN ('pending', 'sent', 'delivered')), 0),
        'push_opt_in_rate', COALESCE((
          SELECT ROUND(
            (
              COUNT(*) FILTER (WHERE fcm_token IS NOT NULL)::numeric
              / NULLIF(COUNT(*), 0)
            ) * 100, 1
          )
          FROM public.profiles
          WHERE is_admin = true OR EXISTS (
            SELECT 1
            FROM public.orders o
            WHERE o.buyer_id = profiles.id OR o.seller_id = profiles.id
          )
        ), 0),
        'bid_volume', COALESCE((SELECT COUNT(*) FROM filtered_bids), 0),
        'avg_bids_per_sold_auction', COALESCE((
          SELECT ROUND(
            (
              COUNT(*)::numeric
              / NULLIF((SELECT COUNT(*) FROM filtered_auctions WHERE status = 'sold'), 0)
            ), 2
          )
          FROM filtered_bids fb
          WHERE EXISTS (
            SELECT 1 FROM filtered_auctions fa
            WHERE fa.id = fb.auction_id AND fa.status = 'sold'
          )
        ), 0),
        'ghost_failed_rate', COALESCE((
          SELECT ROUND(
            (
              COUNT(*) FILTER (WHERE status IN ('ghosted', 'pin_refused', 'refunded'))::numeric
              / NULLIF(COUNT(*), 0)
            ) * 100, 1
          )
          FROM filtered_orders
        ), 0)
      ),
      'daily', COALESCE((
        SELECT jsonb_agg(to_jsonb(day_row) ORDER BY day_row.day)
        FROM (
          SELECT
            d.day,
            COALESCE((SELECT COUNT(*) FROM filtered_auctions a WHERE a.created_at::date = d.day), 0) AS auctions_created,
            COALESCE((SELECT COUNT(*) FROM filtered_auctions a WHERE a.created_at::date = d.day AND a.status = 'sold'), 0) AS auctions_sold,
            COALESCE((SELECT COUNT(*) FROM filtered_bids b WHERE b.created_at::date = d.day), 0) AS bid_count,
            COALESCE((SELECT COUNT(*) FROM filtered_orders o WHERE o.created_at::date = d.day), 0) AS orders_created,
            COALESCE((SELECT COUNT(*) FROM filtered_orders o WHERE o.created_at::date = d.day AND o.status IN ('completed', 'pin_verified')), 0) AS orders_completed,
            COALESCE((SELECT SUM(o.amount) FROM filtered_orders o WHERE o.created_at::date = d.day AND o.status IN ('completed', 'pin_verified')), 0)::numeric(12,2) AS gmv_completed,
            COALESCE((SELECT COUNT(*) FROM filtered_comments c WHERE c.created_at::date = d.day), 0) AS comment_count,
            COALESCE((SELECT COUNT(*) FROM filtered_offers f WHERE f.created_at::date = d.day), 0) AS offer_count,
            COALESCE((SELECT COUNT(*) FROM filtered_saves s WHERE s.created_at::date = d.day), 0) AS saved_count
          FROM filtered_days d
        ) AS day_row
      ), '[]'::jsonb),
      'funnel', jsonb_build_object(
        'auctions_sold', COALESCE((SELECT COUNT(*) FROM filtered_auctions WHERE status = 'sold'), 0),
        'orders_created', COALESCE((SELECT COUNT(*) FROM filtered_orders), 0),
        'pending_payment', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status = 'pending_payment'), 0),
        'funds_held', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status = 'funds_held'), 0),
        'in_delivery', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status = 'in_delivery'), 0),
        'completed', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status IN ('completed', 'pin_verified')), 0),
        'failed', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status IN ('ghosted', 'pin_refused', 'refunded')), 0)
      ),
      'applications', jsonb_build_object(
        'pending', COALESCE((SELECT COUNT(*) FROM filtered_applications WHERE status = 'pending'), 0),
        'approved', COALESCE((SELECT COUNT(*) FROM filtered_applications WHERE status = 'approved'), 0),
        'rejected', COALESCE((SELECT COUNT(*) FROM filtered_applications WHERE status = 'rejected'), 0),
        'avg_review_hours', COALESCE((
          SELECT ROUND(AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600)::numeric, 1)
          FROM filtered_applications
          WHERE reviewed_at IS NOT NULL
        ), 0)
      ),
      'trust', jsonb_build_object(
        'ghosted_orders', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status = 'ghosted'), 0),
        'pin_refused_orders', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status = 'pin_refused'), 0),
        'refunded_orders', COALESCE((SELECT COUNT(*) FROM filtered_orders WHERE status = 'refunded'), 0),
        'deliveries_stuck', COALESCE((SELECT COUNT(*) FROM filtered_deliveries WHERE status IN ('pending', 'sent')), 0),
        'high_attempt_pins', COALESCE((
          SELECT COUNT(*)
          FROM public.order_pins op
          JOIN filtered_orders o ON o.id = op.order_id
          WHERE op.attempts >= 2 AND op.verified_at IS NULL
        ), 0),
        'messages_waiting', COALESCE((
          SELECT COUNT(DISTINCT order_id)
          FROM filtered_messages
        ), 0)
      ),
      'top_sellers', COALESCE((
        SELECT jsonb_agg(to_jsonb(seller_row) ORDER BY seller_row.gmv DESC, seller_row.completed_orders DESC)
        FROM (
          SELECT
            p.id AS seller_id,
            p.username,
            p.full_name,
            p.location,
            p.is_verified,
            (SELECT COUNT(*) FROM filtered_auctions a WHERE a.seller_id = p.id) AS listings_total,
            (SELECT COUNT(*) FROM filtered_auctions a WHERE a.seller_id = p.id AND a.status = 'active') AS listings_active,
            (SELECT COUNT(*) FROM filtered_auctions a WHERE a.seller_id = p.id AND a.status = 'sold') AS listings_sold,
            (SELECT COUNT(*) FROM filtered_orders o WHERE o.seller_id = p.id AND o.status IN ('completed', 'pin_verified')) AS completed_orders,
            COALESCE((SELECT SUM(o.amount) FROM filtered_orders o WHERE o.seller_id = p.id AND o.status IN ('completed', 'pin_verified')), 0)::numeric(12,2) AS gmv,
            COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1) FROM filtered_reviews r WHERE r.reviewee_id = p.id), 0)::numeric(4,1) AS avg_rating,
            (SELECT COUNT(*) FROM filtered_reviews r WHERE r.reviewee_id = p.id) AS review_count,
            (SELECT COUNT(*) FROM filtered_bids b JOIN filtered_auctions a ON a.id = b.auction_id WHERE a.seller_id = p.id) AS total_bids,
            (SELECT COUNT(*) FROM filtered_offers f WHERE f.seller_id = p.id) AS offer_count,
            (SELECT COUNT(*) FROM filtered_comments c JOIN filtered_auctions a ON a.id = c.auction_id WHERE a.seller_id = p.id) AS comment_count,
            (SELECT COUNT(*) FROM filtered_saves s JOIN filtered_auctions a ON a.id = s.auction_id WHERE a.seller_id = p.id) AS saved_count,
            (SELECT MAX(a.created_at) FROM filtered_auctions a WHERE a.seller_id = p.id) AS last_listing_at
          FROM public.profiles p
          WHERE EXISTS (SELECT 1 FROM filtered_auctions a WHERE a.seller_id = p.id)
             OR EXISTS (SELECT 1 FROM filtered_orders o WHERE o.seller_id = p.id)
          ORDER BY gmv DESC, completed_orders DESC
          LIMIT 8
        ) AS seller_row
      ), '[]'::jsonb),
      'top_buyers', COALESCE((
        SELECT jsonb_agg(to_jsonb(buyer_row) ORDER BY buyer_row.total_spend DESC, buyer_row.orders_completed DESC)
        FROM (
          SELECT
            p.id AS buyer_id,
            p.username,
            p.full_name,
            p.location,
            (SELECT COUNT(*) FROM filtered_bids b WHERE b.bidder_id = p.id) AS bids_placed,
            (SELECT COUNT(*) FROM filtered_auctions a WHERE a.winner_id = p.id) AS auctions_won,
            (SELECT COUNT(*) FROM filtered_orders o WHERE o.buyer_id = p.id AND o.status IN ('completed', 'pin_verified')) AS orders_completed,
            COALESCE((SELECT SUM(o.amount) FROM filtered_orders o WHERE o.buyer_id = p.id AND o.status IN ('completed', 'pin_verified')), 0)::numeric(12,2) AS total_spend,
            (SELECT COUNT(*) FROM filtered_orders o WHERE o.buyer_id = p.id AND o.status IN ('ghosted', 'pin_refused', 'refunded')) AS failed_orders,
            (SELECT MAX(b.created_at) FROM filtered_bids b WHERE b.bidder_id = p.id) AS last_bid_at
          FROM public.profiles p
          WHERE EXISTS (SELECT 1 FROM filtered_bids b WHERE b.bidder_id = p.id)
             OR EXISTS (SELECT 1 FROM filtered_orders o WHERE o.buyer_id = p.id)
          ORDER BY total_spend DESC, orders_completed DESC
          LIMIT 8
        ) AS buyer_row
      ), '[]'::jsonb),
      'marketplace', COALESCE((
        SELECT jsonb_agg(to_jsonb(market_row) ORDER BY market_row.created_at DESC)
        FROM (
          SELECT
            a.id AS auction_id,
            a.seller_id,
            a.title,
            a.brand,
            a.model,
            a.listing_city,
            a.status,
            a.current_price,
            a.bid_count,
            a.created_at,
            COALESCE(p.full_name, p.username) AS seller_name,
            COALESCE((SELECT COUNT(*) FROM filtered_saves s WHERE s.auction_id = a.id), 0) AS saves,
            COALESCE((SELECT COUNT(*) FROM filtered_comments c WHERE c.auction_id = a.id), 0) AS comments,
            COALESCE((SELECT COUNT(*) FROM filtered_offers f WHERE f.auction_id = a.id), 0) AS offers,
            o.id AS order_id,
            o.status AS order_status,
            d.status AS delivery_status
          FROM filtered_auctions a
          LEFT JOIN public.profiles p ON p.id = a.seller_id
          LEFT JOIN filtered_orders o ON o.auction_id = a.id
          LEFT JOIN filtered_deliveries d ON d.auction_id = a.id
          ORDER BY a.created_at DESC
          LIMIT 12
        ) AS market_row
      ), '[]'::jsonb),
      'seller_performance', COALESCE((
        SELECT jsonb_agg(to_jsonb(perf_row) ORDER BY perf_row.gmv DESC, perf_row.listings_sold DESC)
        FROM (
          SELECT
            p.id AS seller_id,
            p.username,
            p.full_name,
            p.location,
            p.is_verified,
            (SELECT COUNT(*) FROM filtered_auctions a WHERE a.seller_id = p.id) AS listings_total,
            (SELECT COUNT(*) FROM filtered_auctions a WHERE a.seller_id = p.id AND a.status = 'active') AS listings_active,
            (SELECT COUNT(*) FROM filtered_auctions a WHERE a.seller_id = p.id AND a.status = 'sold') AS listings_sold,
            (SELECT COUNT(*) FROM filtered_orders o WHERE o.seller_id = p.id AND o.status IN ('completed', 'pin_verified')) AS completed_orders,
            COALESCE((SELECT SUM(o.amount) FROM filtered_orders o WHERE o.seller_id = p.id AND o.status IN ('completed', 'pin_verified')), 0)::numeric(12,2) AS gmv,
            COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1) FROM filtered_reviews r WHERE r.reviewee_id = p.id), 0)::numeric(4,1) AS avg_rating,
            (SELECT COUNT(*) FROM filtered_bids b JOIN filtered_auctions a ON a.id = b.auction_id WHERE a.seller_id = p.id) AS total_bids,
            (SELECT COUNT(*) FROM filtered_saves s JOIN filtered_auctions a ON a.id = s.auction_id WHERE a.seller_id = p.id) AS saved_count
          FROM public.profiles p
          WHERE EXISTS (SELECT 1 FROM filtered_auctions a WHERE a.seller_id = p.id)
             OR EXISTS (SELECT 1 FROM filtered_orders o WHERE o.seller_id = p.id)
          ORDER BY gmv DESC, listings_sold DESC
          LIMIT 20
        ) AS perf_row
      ), '[]'::jsonb)
    )
  );
END;
$$;

GRANT SELECT ON public.super_admin_daily_marketplace_metrics TO authenticated;
GRANT SELECT ON public.super_admin_seller_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_super_admin_dashboard(DATE, DATE, UUID, TEXT, TEXT, TEXT) TO authenticated;
