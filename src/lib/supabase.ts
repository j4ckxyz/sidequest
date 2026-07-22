import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Real Supabase client, ready for when a project is provisioned (see supabase/migrations
 * for the schema to apply). Until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set,
 * this stays null and the app runs entirely on the mock data layer in src/lib/mockDb.ts.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isLiveBackend = supabase !== null;
