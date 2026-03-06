-- 024_notification_enhancements.sql
-- Add 'new_message' and 'system' to notification_type enum
-- Add order_id column to notifications for direct order linking

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_message';

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_order ON public.notifications(order_id)
    WHERE order_id IS NOT NULL;
