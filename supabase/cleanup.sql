-- ─── 0. CLEANUP EXISTING TABLES & TYPES ───
-- This ensures the migration runs cleanly even if there was a previous attempt.
-- It drops tables and types so they can be securely recreated.

-- 1. Drop all tables (CASCADE handles foreign key dependencies)
DROP TABLE IF EXISTS public.order_pins CASCADE;
DROP TABLE IF EXISTS public.escrow_payments CASCADE;
DROP TABLE IF EXISTS public.deposits CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.watchlist CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.auction_images CASCADE;
DROP TABLE IF EXISTS public.bids CASCADE;
DROP TABLE IF EXISTS public.auctions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Drop all custom ENUM types
DROP TYPE IF EXISTS public.auction_status CASCADE;
DROP TYPE IF EXISTS public.auction_condition CASCADE;
DROP TYPE IF EXISTS public.phone_condition CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;
DROP TYPE IF EXISTS public.fulfillment_type CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.deposit_status CASCADE;
DROP TYPE IF EXISTS public.escrow_status CASCADE;

-- 3. Drop all custom functions to prevent signature conflicts
DROP FUNCTION IF EXISTS public.place_bid CASCADE;
DROP FUNCTION IF EXISTS public.close_expired_auctions CASCADE;
DROP FUNCTION IF EXISTS public.create_order_pin CASCADE;
DROP FUNCTION IF EXISTS public.verify_order_pin CASCADE;

-- ──────────────────────────────────────────

