-- Message alerts default ON for new accounts.
-- Changes only the column default, so it applies to profiles created after it runs.
-- Existing rows (including anyone who saved New messages = off) are NOT rewritten.
ALTER TABLE public.profiles
  ALTER COLUMN notification_preferences
  SET DEFAULT '{"new_bid": true, "auction_ending": true, "auction_won": true, "new_message": true, "promotions": false}'::jsonb;
