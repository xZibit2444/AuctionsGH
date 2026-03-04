-- 010_pins.sql
-- 4-digit delivery verification PIN for Escrow & Delivery orders.
-- PIN is hashed — plaintext is never stored.

CREATE TABLE public.order_pins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pin_hash     TEXT NOT NULL,             -- pgcrypto crypt() hash of the 4-digit PIN
  expires_at   TIMESTAMPTZ NOT NULL,      -- system time + 24 hours
  attempts     SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 3,
  verified_at  TIMESTAMPTZ,              -- set on successful PIN entry
  created_at   TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT one_pin_per_order UNIQUE (order_id)
);

ALTER TABLE order_pins ENABLE ROW LEVEL SECURITY;

-- Only the buyer of the linked order can query this row
-- (they never see the hash — they only submit a guess)
CREATE POLICY "Buyer can view their pin record (not the hash)"
  ON order_pins FOR SELECT
  USING (
    auth.uid() = (SELECT buyer_id FROM orders WHERE id = order_id)
  );

-- ─── Atomic PIN creation & verification functions ──────────────────────────────

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Called by create-order edge function to generate and store PIN
CREATE OR REPLACE FUNCTION create_order_pin(p_order_id UUID)
RETURNS TEXT   -- returns plaintext PIN (edge function sends it to buyer via notification)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin      TEXT;
  v_pin_hash TEXT;
BEGIN
  -- Generate random 4-digit PIN (zero-padded)
  v_pin := lpad((floor(random() * 10000)::int)::text, 4, '0');
  v_pin_hash := crypt(v_pin, gen_salt('bf', 8));

  INSERT INTO order_pins (order_id, pin_hash, expires_at)
    VALUES (p_order_id, v_pin_hash, now() + INTERVAL '24 hours')
    ON CONFLICT (order_id) DO UPDATE
      SET pin_hash   = EXCLUDED.pin_hash,
          expires_at = EXCLUDED.expires_at,
          attempts   = 0,
          verified_at = NULL;

  RETURN v_pin;   -- caller must send this to buyer securely; it is NOT stored
END;
$$;


-- Called by verify-pin edge function
-- Returns: 'verified' | 'wrong_pin' | 'max_attempts' | 'expired' | 'not_found'
CREATE OR REPLACE FUNCTION verify_order_pin(
  p_order_id UUID,
  p_pin      TEXT      -- plaintext guess from buyer
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pin_row order_pins%ROWTYPE;
BEGIN
  SELECT * INTO v_pin_row
    FROM order_pins
    WHERE order_id = p_order_id
    FOR UPDATE;

  IF v_pin_row IS NULL THEN
    RETURN 'not_found';
  END IF;

  IF v_pin_row.verified_at IS NOT NULL THEN
    RETURN 'verified'; -- already done
  END IF;

  IF v_pin_row.expires_at < now() THEN
    RETURN 'expired';
  END IF;

  IF v_pin_row.attempts >= v_pin_row.max_attempts THEN
    RETURN 'max_attempts';
  END IF;

  -- Check PIN
  IF v_pin_row.pin_hash = crypt(p_pin, v_pin_row.pin_hash) THEN
    -- Correct PIN
    UPDATE order_pins SET verified_at = now() WHERE order_id = p_order_id;
    UPDATE orders      SET status = 'pin_verified', updated_at = now() WHERE id = p_order_id;
    RETURN 'verified';
  ELSE
    -- Wrong PIN — increment attempts
    UPDATE order_pins SET attempts = attempts + 1 WHERE order_id = p_order_id;

    IF v_pin_row.attempts + 1 >= v_pin_row.max_attempts THEN
      -- Auto-trigger refund flow
      UPDATE orders SET status = 'pin_refused', updated_at = now() WHERE id = p_order_id;
      RETURN 'max_attempts';
    END IF;

    RETURN 'wrong_pin';
  END IF;
END;
$$;
