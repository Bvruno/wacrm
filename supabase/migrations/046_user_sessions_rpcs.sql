-- ============================================================
-- 046_user_sessions_rpcs.sql — list + revoke user sessions
--
-- These RPCs let authenticated users manage their own sessions
-- by reading from / writing to GoTrue's auth.sessions table,
-- which is in the auth schema and not accessible through the
-- regular PostgREST API.
--
-- get_my_sessions()       → JSON array of session objects
-- delete_my_session(id)   → revoke a single session (not the
--                            current one — the caller passes
--                            the session id they want to drop).
-- ============================================================

-- ============================================================
-- get_my_sessions()
--
-- Returns every session row whose user_id matches the calling
-- user. Ordered by most-recently-refreshed first (nulls last),
-- then by creation date descending.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSON;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', s.id,
      'user_id', s.user_id,
      'created_at', s.created_at,
      'updated_at', s.updated_at,
      'refreshed_at', s.refreshed_at,
      'user_agent', s.user_agent,
      'ip', s.ip::text,
      'aal', s.aal::text
    ) ORDER BY s.refreshed_at DESC NULLS LAST, s.created_at DESC
  ), '[]'::JSON)
  INTO v_result
  FROM sessions s
  WHERE s.user_id = v_user_id;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.get_my_sessions() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_sessions() TO authenticated;

-- ============================================================
-- delete_my_session(p_session_id UUID)
--
-- Deletes a session row owned by the calling user. Returns TRUE
-- if a row was actually deleted, FALSE if the session didn't
-- exist or didn't belong to the caller.
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_my_session(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  DELETE FROM sessions s
  WHERE s.id = p_session_id
    AND s.user_id = v_user_id;

  RETURN FOUND;
END;
$$;

ALTER FUNCTION public.delete_my_session(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_my_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_session(UUID) TO authenticated;
