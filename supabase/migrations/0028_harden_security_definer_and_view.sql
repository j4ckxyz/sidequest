-- Recreate public_profiles as security_invoker so RLS of the querying user applies
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  bio,
  CASE
    WHEN id = auth.uid() OR public.is_admin() OR NOT hide_location THEN parish
    ELSE NULL::text
  END AS parish,
  CASE
    WHEN id = auth.uid() OR public.is_admin() THEN phone
    ELSE NULL::text
  END AS phone,
  skills,
  is_verified,
  is_admin,
  is_owner,
  is_bot,
  CASE
    WHEN id = auth.uid() OR public.is_admin() THEN interest_keywords
    ELSE '{}'::text[]
  END AS interest_keywords,
  hide_location,
  CASE
    WHEN id = auth.uid() OR public.is_admin() THEN saved_pins
    ELSE '[]'::jsonb
  END AS saved_pins,
  rating_avg,
  rating_count,
  jobs_posted_count,
  jobs_completed_count,
  onboarded,
  top_category,
  created_at,
  public.is_blocked(id) AS is_blocked
FROM public.profiles p;

GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;

-- Lock down trigger-only SECURITY DEFINER functions (not meant as public RPCs)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_jobs_completed_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_jobs_posted_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_application_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_application_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_message_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_admin_flag() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_rating() FROM PUBLIC, anon, authenticated;

-- User-facing RPCs: authenticated only (not anonymous)
REVOKE ALL ON FUNCTION public.accept_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_application(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.change_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_username(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_job(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.start_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_job(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.match_jobs_search(text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_jobs_search(text, integer, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.match_open_jobs(text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_open_jobs(text, uuid, integer) TO authenticated, service_role;

-- Helper predicates used in RLS: keep callable, but not anonymous abuse of sensitive ones if unused by anon RLS
-- is_admin / is_owner / is_blocked / is_accepted_applicant are used in policies; keep for authenticated + anon as needed for RLS evaluation
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_accepted_applicant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_accepted_applicant(uuid, uuid) TO anon, authenticated, service_role;

-- Pin search_path on mutable functions
ALTER FUNCTION public.enforce_job_status_transition() SET search_path = public;
ALTER FUNCTION public.limit_open_jobs() SET search_path = public;
ALTER FUNCTION public.limit_message_rate() SET search_path = public;
ALTER FUNCTION public.base62_encode(bigint) SET search_path = public;
ALTER FUNCTION public.gen_job_public_id() SET search_path = public;
