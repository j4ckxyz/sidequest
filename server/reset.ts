// Prototype helper: wipe everything tied to a user and reset their profile to a
// blank, un-onboarded state — so they can go through name/username/topics again.
// Admin-only (a user resets their OWN account). Keeps the auth user + is_admin.
import { admin } from './supabaseAdmin';

async function tryDelete(label: string, run: () => Promise<{ error: unknown }>): Promise<void> {
  try {
    const { error } = await run();
    if (error) console.warn(`[reset] ${label}:`, (error as { message?: string }).message ?? error);
  } catch (err) {
    console.warn(`[reset] ${label} threw:`, err instanceof Error ? err.message : err);
  }
}

/** Delete every row keyed on a user across the app's tables. Shared by reset (keeps the
 * profile + auth user) and full deletion (drops those too). Best-effort per table. */
async function wipeUserContent(userId: string): Promise<void> {
  const orSelf = `poster_id.eq.${userId},quester_id.eq.${userId}`;

  // Jobs the user posted (cascades their applications, conversations, notifications,
  // embeddings, recommendations). Then everything else keyed on the user.
  await tryDelete('jobs', () => admin.from('jobs').delete().eq('poster_id', userId));
  await tryDelete('applications', () => admin.from('applications').delete().eq('quester_id', userId));
  await tryDelete('conversations', () => admin.from('conversations').delete().or(orSelf));
  await tryDelete('reviews', () => admin.from('reviews').delete().or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`));
  await tryDelete('notifications', () => admin.from('notifications').delete().or(`recipient_id.eq.${userId},actor_id.eq.${userId}`));
  await tryDelete('reports', () => admin.from('reports').delete().or(`reporter_id.eq.${userId},target_user_id.eq.${userId}`));
  await tryDelete('moderation_actions', () => admin.from('moderation_actions').delete().eq('target_user_id', userId));
  await tryDelete('job_preference_messages', () => admin.from('job_preference_messages').delete().eq('user_id', userId));
  await tryDelete('job_preferences', () => admin.from('job_preferences').delete().eq('user_id', userId));
  await tryDelete('ai_daily_usage', () => admin.from('ai_daily_usage').delete().eq('user_id', userId));
  await tryDelete('profile_embeddings', () => admin.from('profile_embeddings').delete().eq('user_id', userId));
  await tryDelete('user_taste', () => admin.from('user_taste').delete().eq('user_id', userId));
  await tryDelete('recommendations', () => admin.from('recommendations').delete().eq('user_id', userId));
  await tryDelete('push_subscriptions', () => admin.from('push_subscriptions').delete().eq('user_id', userId));
  await tryDelete('username_history', () => admin.from('username_history').delete().eq('user_id', userId));
}

export async function resetAccount(userId: string): Promise<void> {
  const { data: prof } = await admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  if (!prof?.is_admin) {
    throw new Error('Account reset is only available for Admin accounts.');
  }

  await wipeUserContent(userId);

  // Free the username via a security-definer RPC that bypasses the 7-day cooldown
  // trigger (protect_username_change) inside a single transaction. Doing this here —
  // rather than setting username in the profile update below — means the column-scoped
  // BEFORE UPDATE trigger never fires on the main reset update.
  const { error: freeErr } = await admin.rpc('admin_free_username', { p_user_id: userId });
  if (freeErr) throw new Error(`free username: ${freeErr.message}`);

  // Reset the profile to a fresh, un-onboarded state (preserve id/email/avatar and
  // is_admin/is_owner so they can still administer after re-onboarding).
  const { error } = await admin
    .from('profiles')
    .update({
      onboarded: false,
      full_name: '',
      bio: '',
      skills: [],
      interest_keywords: [],
      top_category: null,
      hide_location: false,
      jobs_posted_count: 0,
      jobs_completed_count: 0,
      rating_avg: 0,
      rating_count: 0,
      banned_until: null,
      suspended: false,
      ban_reason: null,
    })
    .eq('id', userId);
  if (error) throw new Error(`reset profile: ${error.message}`);
}

/** Permanently delete a user: all their content, their profile row, and their auth user.
 * Caller authorization (admin, and never the owner) is enforced at the endpoint. */
export async function deleteAccount(targetUserId: string): Promise<void> {
  const { data: prof } = await admin
    .from('profiles')
    .select('is_owner')
    .eq('id', targetUserId)
    .maybeSingle();
  if (prof?.is_owner) throw new Error('The owner account cannot be deleted.');

  await wipeUserContent(targetUserId);

  // Drop the profile row, then the auth user. Auth deletion last so a failed content
  // wipe can't orphan an unauthenticatable profile.
  await tryDelete('profile', () => admin.from('profiles').delete().eq('id', targetUserId));

  const { error: authErr } = await admin.auth.admin.deleteUser(targetUserId);
  if (authErr) throw new Error(`delete auth user: ${authErr.message}`);
}
