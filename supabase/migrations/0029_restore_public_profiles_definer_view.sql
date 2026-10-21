-- Revert public_profiles to its original (security definer) behaviour: profiles RLS only lets users read their own row,
-- so the view is the deliberate way other users' public fields are shown, with private fields masked.
ALTER VIEW public.public_profiles SET (security_invoker = false);
GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;
