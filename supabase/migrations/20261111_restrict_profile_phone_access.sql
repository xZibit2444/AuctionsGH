-- 20261111_restrict_profile_phone_access.sql
-- profiles.phone_number was readable by anyone: the public SELECT policy on
-- profiles covers every column, and the site's anon key is public by design.
-- This revokes direct column access and replaces it with a security-definer
-- function that returns a phone only to:
--   1. the owner of the profile,
--   2. buyers/sellers who share an order with the profile (deal handoff),
--   3. admins,
--   4. anyone, when the seller opted in to the listing WhatsApp button.

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

REVOKE SELECT (phone_number) ON TABLE public.profiles FROM anon, authenticated;
