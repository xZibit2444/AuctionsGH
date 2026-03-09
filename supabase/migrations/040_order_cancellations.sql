-- 040_order_cancellations.sql
-- Add explicit cancellation states and metadata for orders.

DO $$
BEGIN
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_by_buyer';
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_by_seller';
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_mutual';
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_unpaid';
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled_admin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON public.orders(cancelled_at);

-- Refresh stale-order cleanup with shorter, more explicit cancellation rules.
CREATE OR REPLACE FUNCTION close_stale_deals()
RETURNS void AS $$
DECLARE
    reopened_auction_id UUID;
BEGIN
    -- Meet & inspect orders abandoned for 72 hours count as ghosted.
    UPDATE public.orders
    SET
        status = 'ghosted',
        updated_at = NOW()
    WHERE
        status = 'pending_meetup'
        AND fulfillment_type = 'meet_and_inspect'
        AND created_at < NOW() - INTERVAL '72 hours';

    -- Escrow orders left unpaid for 24 hours are auto-cancelled and the listing is reopened.
    FOR reopened_auction_id IN
        UPDATE public.orders
        SET
            status = 'cancelled_unpaid',
            cancellation_reason = COALESCE(cancellation_reason, 'Payment not completed within 24 hours'),
            cancelled_at = COALESCE(cancelled_at, NOW()),
            updated_at = NOW()
        WHERE
            status = 'pending_payment'
            AND fulfillment_type = 'escrow_delivery'
            AND created_at < NOW() - INTERVAL '24 hours'
        RETURNING auction_id
    LOOP
        UPDATE public.auctions
        SET
            status = 'active',
            winner_id = NULL,
            ends_at = GREATEST(ends_at, NOW() + INTERVAL '24 hours'),
            updated_at = NOW()
        WHERE id = reopened_auction_id;
    END LOOP;

    -- Escrow orders stuck in flight for 1 week are refunded.
    UPDATE public.orders
    SET
        status = 'refunded',
        updated_at = NOW()
    WHERE
        status IN ('funds_held', 'in_delivery', 'pin_refused', 'returning')
        AND fulfillment_type = 'escrow_delivery'
        AND updated_at < NOW() - INTERVAL '1 week';

    -- Force-end any stale active auctions as a safety net.
    UPDATE public.auctions
    SET
        status = 'ended',
        updated_at = NOW()
    WHERE
        status = 'active'
        AND ends_at < NOW() - INTERVAL '1 week';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
