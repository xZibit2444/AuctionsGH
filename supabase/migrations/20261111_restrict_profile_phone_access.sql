-- 20261111_restrict_profile_phone_access.sql
-- Two problems fixed here:
--
-- 1. profiles.phone_number was readable by anyone: the table-level SELECT
--    grant to anon/authenticated covers every column, the RLS policy allows
--    public reads, and the site's anon key is public by design.
-- 2. The table-level UPDATE grant plus "users can update own profile" let any
--    authenticated user set privileged columns on their own row
--    (is_admin, is_super_admin, is_verified, is_banned, ...).
--
-- Column-level REVOKE alone does NOT override a table-level grant, so we
-- revoke the table-level grants and re-grant exactly the columns each role
-- may read/write. service_role is untouched (server/admin flows keep working).

-- ── 1. Gated phone access ──
CREATE OR REPLACE FUNCTION public.get_profile_phone(profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN p.id = auth.uid() THEN p.phone_number
        WHEN p.whatsapp_enabled THEN p.phone_number
        WHEN EXISTS (
            SELECT 1 FROM profiles ap
            WHERE ap.id = auth.uid() AND (ap.is_admin OR ap.is_super_admin)
        ) THEN p.phone_number
        WHEN EXISTS (
            SELECT 1 FROM orders o
            WHERE (o.buyer_id = auth.uid() AND o.seller_id = p.id)
               OR (o.seller_id = auth.uid() AND o.buyer_id = p.id)
        ) THEN p.phone_number
        ELSE NULL
    END
    FROM profiles p
    WHERE p.id = profile_id;
$$;

REVOKE ALL ON FUNCTION public.get_profile_phone(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_profile_phone(uuid) TO anon, authenticated;

-- ── 2. Replace table-level SELECT with per-column grants (no phone) ──
REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (
    id, username, full_name, avatar_url, location,
    is_verified, is_admin, is_super_admin,
    is_banned, banned_at, banned_reason, banned_by,
    show_past_buys, show_past_sales,
    notification_preferences, whatsapp_enabled,
    created_at, updated_at
) ON TABLE public.profiles TO anon, authenticated;

-- ── 3. Lock self-service profile updates to safe columns ──
-- Settings writes: username, full_name, avatar_url, phone_number, location,
-- show_past_buys, show_past_sales, whatsapp_enabled, notification_preferences.
-- Admin/verification/ban changes all run through the service role.
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (
    username, full_name, avatar_url, phone_number, location,
    show_past_buys, show_past_sales,
    notification_preferences, whatsapp_enabled,
    updated_at
) ON TABLE public.profiles TO authenticated;
