-- 011_security_hardening.sql
-- Restrict search_path on all SECURITY DEFINER functions to prevent
-- search_path hijacking attacks.

-- ── place_bid ──
ALTER FUNCTION place_bid(UUID, UUID, NUMERIC)
  SET search_path = public;

-- ── close_expired_auctions ──
ALTER FUNCTION close_expired_auctions()
  SET search_path = public;

-- ── create_order_pin ──
ALTER FUNCTION create_order_pin(UUID)
  SET search_path = public;

-- ── verify_order_pin ──
ALTER FUNCTION verify_order_pin(UUID, TEXT)
  SET search_path = public;
