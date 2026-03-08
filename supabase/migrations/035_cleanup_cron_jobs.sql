-- 035_cleanup_cron_jobs.sql
-- Automatic cleanup:
--   1. Permanently delete messages older than 1 month (both auction chat and order chat)
--   2. Auto-close orders/auctions that remain active for more than 1 week

-- ─────────────────────────────────────────────
-- 1. MESSAGE CLEANUP FUNCTION
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
    -- Delete auction chat messages older than 1 month
    DELETE FROM public.messages
    WHERE created_at < NOW() - INTERVAL '1 month';

    -- Delete order chat messages older than 1 month
    DELETE FROM public.order_messages
    WHERE created_at < NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 2. STALE DEAL AUTO-CLOSE FUNCTION
-- ─────────────────────────────────────────────
-- "Active" order statuses (non-terminal) that should be closed
-- after 1 week if still unresolved.
-- Terminal statuses (left as-is): completed, ghosted, refunded
CREATE OR REPLACE FUNCTION close_stale_deals()
RETURNS void AS $$
BEGIN
    -- Close stale Meet & Inspect orders (pending_meetup > 1 week → ghosted)
    UPDATE public.orders
    SET
        status     = 'ghosted',
        updated_at = NOW()
    WHERE
        status           = 'pending_meetup'
        AND fulfillment_type = 'meet_and_inspect'
        AND created_at   < NOW() - INTERVAL '1 week';

    -- Close stale Escrow/Delivery orders still awaiting payment after 1 week → refunded
    UPDATE public.orders
    SET
        status     = 'refunded',
        updated_at = NOW()
    WHERE
        status           = 'pending_payment'
        AND fulfillment_type = 'escrow_delivery'
        AND created_at   < NOW() - INTERVAL '1 week';

    -- Close stale escrow orders stuck in-flight (funds_held, in_delivery, pin_refused,
    -- returning) after 1 week → refunded
    UPDATE public.orders
    SET
        status     = 'refunded',
        updated_at = NOW()
    WHERE
        status IN ('funds_held', 'in_delivery', 'pin_refused', 'returning')
        AND fulfillment_type = 'escrow_delivery'
        AND updated_at < NOW() - INTERVAL '1 week';

    -- Force-end any active auctions that are still marked 'active'
    -- but whose ends_at has been in the past for more than 1 week
    -- (safety net in case finalize_expired_auctions missed them)
    UPDATE public.auctions
    SET
        status     = 'ended',
        updated_at = NOW()
    WHERE
        status   = 'active'
        AND ends_at < NOW() - INTERVAL '1 week';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 3. SCHEDULE CRON JOBS
-- ─────────────────────────────────────────────

-- Remove old schedules if they exist (idempotent re-runs)
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('cleanup_old_messages_job', 'close_stale_deals_job');

-- Run message cleanup once a day at 03:00 UTC
SELECT cron.schedule(
    'cleanup_old_messages_job',
    '0 3 * * *',
    $$SELECT cleanup_old_messages()$$
);

-- Run stale-deal cleanup once a day at 03:15 UTC
SELECT cron.schedule(
    'close_stale_deals_job',
    '15 3 * * *',
    $$SELECT close_stale_deals()$$
);
