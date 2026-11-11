-- Profile cover image (header banner). Null = default brand cover.
-- Value is either a public image URL (profile-images bucket, <user_id>/cover-*.ext)
-- or a preset key: 'preset:yellow' | 'preset:black'.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url text;

-- Column-level grants (table-level grants were revoked in 20261111_restrict_profile_phone_access.sql).
-- Adds only cover_url; phone_number stays unreadable and privileged columns stay unwritable.
GRANT SELECT (cover_url) ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE (cover_url) ON TABLE public.profiles TO authenticated;
