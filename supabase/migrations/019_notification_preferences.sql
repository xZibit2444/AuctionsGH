-- 019_notification_preferences.sql
-- Add notification_preferences JSONB column to profiles
-- Allows users to persist their notification settings

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
  DEFAULT '{"new_bid": true, "auction_ending": true, "auction_won": true, "new_message": false, "promotions": true}'::jsonb;

UPDATE public.profiles
SET notification_preferences = COALESCE(notification_preferences, '{}'::jsonb) || '{"promotions": true}'::jsonb
WHERE COALESCE((notification_preferences ->> 'promotions')::boolean, false) = false;
