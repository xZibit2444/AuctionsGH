-- Expose the authenticated user's active auth sessions for the settings page.

CREATE OR REPLACE FUNCTION public.list_active_sessions()
RETURNS TABLE (
    session_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    not_after TIMESTAMPTZ,
    ip TEXT,
    user_agent TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT
        s.id AS session_id,
        s.created_at,
        s.updated_at,
        s.not_after,
        s.ip::text AS ip,
        COALESCE(s.user_agent, '') AS user_agent
    FROM auth.sessions AS s
    WHERE s.user_id = auth.uid()
      AND (s.not_after IS NULL OR s.not_after > now())
    ORDER BY COALESCE(s.updated_at, s.created_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.list_active_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_sessions() TO authenticated;
