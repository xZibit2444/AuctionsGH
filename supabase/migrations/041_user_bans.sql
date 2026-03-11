-- 041_user_bans.sql
-- Permanent user bans controlled by super admins.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS banned_reason TEXT,
    ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS profiles_is_banned_idx
    ON public.profiles(is_banned)
    WHERE is_banned = TRUE;
