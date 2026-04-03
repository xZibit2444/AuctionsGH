-- Let regular customers choose whether completed past purchases appear on their public profile.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_past_buys BOOLEAN NOT NULL DEFAULT false;
