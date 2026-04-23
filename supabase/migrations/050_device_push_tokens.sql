-- 050_device_push_tokens.sql
-- Stores Expo push tokens for native mobile clients

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token       TEXT NOT NULL,
    platform    TEXT NOT NULL DEFAULT 'unknown', -- 'ios' | 'android' | 'unknown'
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uq_device_push_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user ON device_push_tokens(user_id);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own tokens" ON device_push_tokens;
CREATE POLICY "Users manage their own tokens"
    ON device_push_tokens
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
