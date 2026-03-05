-- Enable the pg_cron extension if it's not already enabled
-- Note: This requires postgres superuser privileges. On Supabase, this is typically handled via the Dashboard extensions UI.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to finalize expired auctions automatically
CREATE OR REPLACE FUNCTION finalize_expired_auctions()
RETURNS void AS $$
DECLARE
    auction_record RECORD;
BEGIN
    -- Loop through all active auctions that have passed their end time
    FOR auction_record IN 
        SELECT id, current_price, winner_id
        FROM auctions 
        WHERE status = 'active' AND ends_at <= NOW()
    LOOP
        -- If there is a winner_id (meaning a bid was placed), set to 'sold'
        IF auction_record.winner_id IS NOT NULL THEN
            UPDATE auctions 
            SET status = 'sold' 
            WHERE id = auction_record.id;
        ELSE
            -- No bids were placed, set to 'ended'
            UPDATE auctions 
            SET status = 'ended' 
            WHERE id = auction_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every 1 minute
-- Schedule format: (job_name, schedule, command)
SELECT cron.schedule(
    'finalize_auctions_job',
    '* * * * *', -- Every minute
    $$SELECT finalize_expired_auctions()$$
);
