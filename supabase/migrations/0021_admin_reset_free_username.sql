-- Prototype account reset: freeing the username during a reset must bypass the
-- 7-day cooldown trigger (protect_username_change) reliably, without depending on
-- the is_admin bypass being present. This security-definer RPC sets the per-transaction
-- allow flag and then nulls the username in the same transaction, so the BEFORE UPDATE
-- trigger sees sidequest.username_change_allowed = 'true' and lets it through.

create or replace function public.admin_free_username(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Local (transaction-scoped) config; the trigger reads this and allows the change.
  perform set_config('sidequest.username_change_allowed', 'true', true);
  update public.profiles
  set username = null,
      username_changed_at = null
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_free_username(uuid) from public;
grant execute on function public.admin_free_username(uuid) to service_role;
