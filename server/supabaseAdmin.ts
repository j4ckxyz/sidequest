// Service-role Supabase client — bypasses RLS, so this must only ever run server-side.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY — the server needs the service key.');
}

export const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Resolve a Supabase access token to its user id, or null if invalid. */
export async function userIdFromToken(token: string): Promise<string | null> {
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/** True when the given user id is an admin in profiles. */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  return !!data?.is_admin;
}
