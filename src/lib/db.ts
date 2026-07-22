import { db as mockRepo } from './mockDb';
import { db as supabaseRepo } from './supabaseDb';
import { isLiveBackend } from './supabase';

/**
 * Single entry point every hook/component should import `db` from.
 * Real backend kicks in only when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set
 * (see .env.production) — plain `bun run dev` / `npm run dev` always runs on mock data.
 */
export const db = (isLiveBackend ? supabaseRepo : mockRepo) as typeof mockRepo;
