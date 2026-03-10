-- 041_delivery_code_reminders.sql
-- Track when a delivery was marked sent and when the seller last got a code-entry reminder.

ALTER TABLE public.deliveries
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS seller_code_reminder_last_sent_at TIMESTAMPTZ;

UPDATE public.deliveries
SET sent_at = COALESCE(sent_at, created_at)
WHERE status IN ('sent', 'delivered', 'completed')
  AND sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_sent_reminders
    ON public.deliveries (status, sent_at, seller_code_reminder_last_sent_at);
