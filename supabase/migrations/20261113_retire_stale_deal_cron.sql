-- 2026-11-13: Direct-contact marketplace rollout
-- Orders, delivery codes and escrow fulfillment are retired product flows;
-- deals are arranged directly between buyer and seller (offers, Deal & Chat,
-- WhatsApp). The close_stale_deals_job pg_cron schedule existed only to
-- transition order statuses for those retired flows and was removed live on
-- 2026-11-13 via cron.unschedule. This migration captures that removal so a
-- database rebuild that replays 035_cleanup_cron_jobs.sql cannot revive it.
-- Retained unchanged: cleanup_old_messages_job (message retention) and
-- finalize_auctions_job (auction status finalization). No data is touched.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule(jobid)
        FROM cron.job
        WHERE jobname = 'close_stale_deals_job';
    END IF;
END;
$$;
