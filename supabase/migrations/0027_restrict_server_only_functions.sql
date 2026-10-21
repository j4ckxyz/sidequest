-- Migration: restrict_server_only_functions
-- Fixes advisor lints 0028/0029 for the SECURITY DEFINER functions that the repo's own
-- migrations (0012, 0021, ...) meant to be service_role-only. Those migrations ran
-- "revoke all ... from public; grant execute ... to service_role;", but Supabase's default
-- privileges had already granted EXECUTE directly to anon and authenticated, so the revoke
-- from PUBLIC did not remove them. Result: anyone with the publishable key could call
--   /rest/v1/rpc/admin_free_username        -> wipe any user's username
--   /rest/v1/rpc/save_job_preferences       -> overwrite any user's job prefs / hide_location
--   /rest/v1/rpc/save_preference_chat_turn  -> write into any user's AI preference chat
--   /rest/v1/rpc/claim_preference_chat_quota-> burn per-user and global AI quota
--   /rest/v1/rpc/has_accepted_application   -> probe who was accepted for which job
-- None of these take auth.uid() into account. In the repo they are only called from server/
-- via the service-role client (server/index.ts, server/reset.ts); the frontend never calls
-- them, and no RLS policy, view or other function references them.

revoke execute on function public.admin_free_username(uuid) from public, anon, authenticated;
revoke execute on function public.save_job_preferences(uuid, text[], boolean) from public, anon, authenticated;
revoke execute on function public.save_preference_chat_turn(uuid, text, text, text, text[]) from public, anon, authenticated;
revoke execute on function public.claim_preference_chat_quota(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.has_accepted_application(uuid, uuid) from public, anon, authenticated;

grant execute on function public.admin_free_username(uuid) to service_role;
grant execute on function public.save_job_preferences(uuid, text[], boolean) to service_role;
grant execute on function public.save_preference_chat_turn(uuid, text, text, text, text[]) to service_role;
grant execute on function public.claim_preference_chat_quota(uuid, integer, integer) to service_role;
grant execute on function public.has_accepted_application(uuid, uuid) to service_role;
