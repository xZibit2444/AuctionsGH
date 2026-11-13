-- One-time post-signup profile setup prompt (/setup-profile).
-- New accounts start with profile_setup_done = false and are guided through the
-- setup step after their first sign-in. Existing rows are backfilled to true so
-- current users are never prompted and their profiles are untouched.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_setup_done boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET profile_setup_done = true WHERE profile_setup_done = false;

-- Column-level grants (table-level grants were revoked in 20261111_restrict_profile_phone_access.sql).
GRANT SELECT (profile_setup_done) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (profile_setup_done) ON TABLE public.profiles TO authenticated;
