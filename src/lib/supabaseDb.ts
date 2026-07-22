import { supabase } from './supabase';
import type {
  Application,
  Conversation,
  Job,
  JobPreferenceState,
  JobRecommendation,
  Message,
  ModerationAction,
  ModerationEvent,
  Notification,
  Profile,
  PushSubscriptionInput,
  Report,
  Review,
} from '../types/models';

const RECS_API_URL = import.meta.env.VITE_RECS_API_URL as string | undefined;

async function recsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!RECS_API_URL) throw new Error('The recommendations service URL is not configured (VITE_RECS_API_URL).');
  const { data } = await client().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${RECS_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function recsPost<T>(path: string, body: unknown): Promise<T> {
  return recsRequest<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

/**
 * Real Supabase-backed implementation of the same interface as src/lib/mockDb.ts's `db`.
 * Selected automatically by src/lib/db.ts once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * are set (see .env.production). Schema + RLS this relies on: supabase/migrations/0001_init.sql.
 */

function client() {
  if (!supabase) throw new Error('Supabase is not configured — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

// Propagate Supabase auth changes (incl. the session that lands after the Google redirect)
// to AuthProvider, which re-reads the session on every notify().
supabase?.auth.onAuthStateChange(() => notify());

export const db = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // ---- auth ----------------------------------------------------------
  auth: {
    async getSession(): Promise<Profile | null> {
      const { data } = await client().auth.getSession();
      const sessionUser = data.session?.user;
      if (!sessionUser) return null;
      let { data: profile } = await client().from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
      // Backfill the Google avatar for accounts created before the signup trigger captured it.
      const googleAvatar = (sessionUser.user_metadata?.avatar_url as string | undefined) ?? undefined;
      if (profile && !(profile as Profile).avatar_url && googleAvatar) {
        const { data: updated } = await client()
          .from('profiles')
          .update({ avatar_url: googleAvatar })
          .eq('id', sessionUser.id)
          .select()
          .single();
        profile = updated ?? profile;
      }
      return (profile as Profile | null) ?? null;
    },
    async signInWithGoogle(): Promise<void> {
      // Redirects the browser to Google and back to this origin. The handle_new_user trigger
      // creates the profiles row on first sign-in; onAuthStateChange (below) picks up the
      // returning session and notifies AuthProvider.
      const { error } = await client().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
    },
    async signOut(): Promise<void> {
      await client().auth.signOut();
      notify();
    },
  },

  // ---- profiles -------------------------------------------------------
  profiles: {
    async get(id: string): Promise<Profile | null> {
      const { data } = await client().from('public_profiles').select('*').eq('id', id).maybeSingle();
      return (data as Profile | null) ?? null;
    },
    async getByUsername(username: string): Promise<Profile | null> {
      const { data } = await client().from('public_profiles').select('*').ilike('username', username).maybeSingle();
      if (data) return data as Profile;
      // Fall back to a past handle so old /u/<handle> links still resolve.
      const { data: hist } = await client()
        .from('username_history')
        .select('user_id')
        .eq('username_lower', username.toLowerCase())
        .maybeSingle();
      if (hist) return db.profiles.get((hist as { user_id: string }).user_id);
      return null;
    },
    async changeUsername(newUsername: string): Promise<void> {
      const { error } = await client().rpc('change_username', { p_new: newUsername.toLowerCase() });
      if (error) throw new Error(error.message);
      notify();
    },
    async usernameAvailable(username: string, excludeId?: string): Promise<boolean> {
      let query = client().from('public_profiles').select('id').ilike('username', username);
      if (excludeId) query = query.neq('id', excludeId);
      const { data } = await query.maybeSingle();
      return !data;
    },
    async update(id: string, patch: Partial<Profile>): Promise<Profile> {
      const result = await client().from('profiles').update(patch).eq('id', id).select().single();
      notify();
      return unwrap<Profile>(result);
    },
    async reviewsFor(profileId: string): Promise<Review[]> {
      const { data } = await client().from('reviews').select('*').eq('reviewee_id', profileId).order('created_at', { ascending: false });
      return (data as Review[]) ?? [];
    },
    async listAll(_callerId: string): Promise<Profile[]> {
      const { data } = await client().from('profiles').select('*').order('full_name');
      return (data as Profile[]) ?? [];
    },
    async setAdmin(_callerId: string, targetId: string, isAdmin: boolean): Promise<Profile> {
      const result = await client().from('profiles').update({ is_admin: isAdmin }).eq('id', targetId).select().single();
      notify();
      return unwrap<Profile>(result);
    },
  },

  // ---- jobs -----------------------------------------------------------
  jobs: {
    async list(filters?: { search?: string; category?: string; parish?: string; status?: string }): Promise<Job[]> {
      let query = client().from('jobs').select('*');
      if (filters?.status) query = query.eq('status', filters.status);
      else query = query.neq('status', 'cancelled');
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.parish) query = query.eq('parish', filters.parish);
      if (filters?.search) {
        const q = filters.search.replace(/[%,]/g, '');
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as Job[]) ?? [];
    },
    async get(id: string): Promise<Job | null> {
      const { data } = await client().from('jobs').select('*').eq('id', id).maybeSingle();
      return data as Job | null;
    },
    async getByPublicId(publicId: string): Promise<Job | null> {
      const { data } = await client().from('jobs').select('*').eq('public_id', publicId).maybeSingle();
      return (data as Job | null) ?? null;
    },
    async listByPoster(posterId: string): Promise<Job[]> {
      const { data } = await client().from('jobs').select('*').eq('poster_id', posterId).order('created_at', { ascending: false });
      return (data as Job[]) ?? [];
    },
    async listAssignedTo(questerId: string): Promise<Job[]> {
      const { data: accepted, error: acceptedError } = await client()
        .from('applications')
        .select('job_id')
        .eq('quester_id', questerId)
        .eq('status', 'accepted');
      if (acceptedError) throw new Error(acceptedError.message);
      const acceptedIds = (accepted ?? []).map((row) => row.job_id as string);
      const [firstHireResult, acceptedResult] = await Promise.all([
        client().from('jobs').select('*').eq('assigned_quester_id', questerId),
        acceptedIds.length > 0
          ? client().from('jobs').select('*').in('id', acceptedIds)
          : Promise.resolve({ data: [] as Job[], error: null }),
      ]);
      if (firstHireResult.error) throw new Error(firstHireResult.error.message);
      if (acceptedResult.error) throw new Error(acceptedResult.error.message);
      const jobs = [...((firstHireResult.data as Job[]) ?? []), ...((acceptedResult.data as Job[]) ?? [])];
      return [...new Map(jobs.map((job) => [job.id, job])).values()];
    },
    async create(input: Omit<Job, 'id' | 'public_id' | 'created_at' | 'status' | 'assigned_quester_id'>): Promise<Job> {
      const result = await client().from('jobs').insert(input).select().single();
      notify();
      return unwrap<Job>(result);
    },
    async update(id: string, patch: Partial<Job>): Promise<Job> {
      const result = await client().from('jobs').update(patch).eq('id', id).select().single();
      notify();
      return unwrap<Job>(result);
    },
    async cancel(id: string): Promise<Job> {
      return db.jobs.update(id, { status: 'cancelled' });
    },
    async markInProgress(id: string): Promise<Job> {
      const { error } = await client().rpc('start_job', { p_job_id: id });
      if (error) throw new Error(error.message);
      const { data } = await client().from('jobs').select('*').eq('id', id).single();
      notify();
      return data as Job;
    },
    async complete(id: string): Promise<Job> {
      // RPC so either the poster or the hired helper can mark it done (RLS lets only the
      // poster UPDATE jobs directly).
      const { error } = await client().rpc('complete_job', { p_job_id: id });
      if (error) throw new Error(error.message);
      const { data } = await client().from('jobs').select('*').eq('id', id).single();
      notify();
      return data as Job;
    },
    async listAllAdmin(_callerId: string): Promise<Job[]> {
      const { data } = await client().from('jobs').select('*').order('created_at', { ascending: false });
      return (data as Job[]) ?? [];
    },
    async adminDelete(_callerId: string, jobId: string): Promise<void> {
      const { error } = await client().from('jobs').delete().eq('id', jobId);
      if (error) throw new Error(error.message);
      notify();
    },
  },

  // ---- applications -----------------------------------------------------
  applications: {
    async listByJob(jobId: string): Promise<Application[]> {
      const { data } = await client().from('applications').select('*').eq('job_id', jobId).order('created_at', { ascending: false });
      return (data as Application[]) ?? [];
    },
    async listByQuester(questerId: string): Promise<Application[]> {
      const { data } = await client().from('applications').select('*').eq('quester_id', questerId).order('created_at', { ascending: false });
      return (data as Application[]) ?? [];
    },
    async create(input: { job_id: string; quester_id: string; message: string; proposed_amount: number | null }): Promise<Application> {
      const job = await db.jobs.get(input.job_id);
      if (!job) throw new Error('Job not found.');
      const result = await client().from('applications').insert(input).select().single();
      const application = unwrap<Application>(result);

      const conversation = await db.conversations.getOrCreateForJob(input.job_id, job.poster_id, input.quester_id);
      if (input.message) {
        await db.messages.send(conversation.id, input.quester_id, input.message);
      }
      notify();
      return application;
    },
    async withdraw(id: string): Promise<Application> {
      const result = await client().from('applications').update({ status: 'withdrawn' }).eq('id', id).select().single();
      notify();
      return unwrap<Application>(result);
    },
    async accept(id: string): Promise<Application> {
      const { error } = await client().rpc('accept_application', { p_application_id: id });
      if (error) throw new Error(error.message);
      const { data } = await client().from('applications').select('*').eq('id', id).single();
      notify();
      return data as Application;
    },
    async reject(id: string): Promise<Application> {
      const result = await client().from('applications').update({ status: 'rejected' }).eq('id', id).select().single();
      notify();
      return unwrap<Application>(result);
    },
  },

  // ---- conversations & messages ------------------------------------------
  conversations: {
    async listForUser(userId: string): Promise<Conversation[]> {
      const { data } = await client()
        .from('conversations')
        .select('*')
        .or(`poster_id.eq.${userId},quester_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });
      return (data as Conversation[]) ?? [];
    },
    async get(id: string): Promise<Conversation | null> {
      const { data } = await client().from('conversations').select('*').eq('id', id).maybeSingle();
      return (data as Conversation | null) ?? null;
    },
    async listForUserEnriched(userId: string) {
      const conversations = await db.conversations.listForUser(userId);
      return Promise.all(
        conversations.map(async (conversation) => {
          const counterpartId = conversation.poster_id === userId ? conversation.quester_id : conversation.poster_id;
          const [counterpart, job, messages] = await Promise.all([
            db.profiles.get(counterpartId),
            db.jobs.get(conversation.job_id),
            db.messages.listByConversation(conversation.id),
          ]);
          const lastMessage = messages[messages.length - 1] ?? null;
          const unread = messages.some((m) => m.sender_id !== userId && !m.read_at);
          return { conversation, counterpart, job, lastMessage, unread };
        }),
      );
    },
    async getOrCreateForJob(jobId: string, posterId: string, questerId: string): Promise<Conversation> {
      const { data: existing } = await client().from('conversations').select('*').eq('job_id', jobId).eq('quester_id', questerId).maybeSingle();
      if (existing) return existing as Conversation;
      const result = await client().from('conversations').insert({ job_id: jobId, poster_id: posterId, quester_id: questerId }).select().single();
      notify();
      return unwrap<Conversation>(result);
    },
  },

  messages: {
    async listByConversation(conversationId: string): Promise<Message[]> {
      const { data } = await client().from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      return (data as Message[]) ?? [];
    },
    async send(conversationId: string, senderId: string, body: string): Promise<Message> {
      const result = await client().from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body }).select().single();
      notify();
      return unwrap<Message>(result);
    },
    async markRead(conversationId: string, readerId: string): Promise<void> {
      const { error } = await client()
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', readerId)
        .is('read_at', null);
      if (error) throw new Error(error.message);
      notify();
    },
    async unreadCountForUser(userId: string): Promise<number> {
      const conversations = await db.conversations.listForUser(userId);
      const counts = await Promise.all(
        conversations.map(async (c) => {
          const { count } = await client()
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', c.id)
            .neq('sender_id', userId)
            .is('read_at', null);
          return count ?? 0;
        }),
      );
      return counts.reduce((a, b) => a + b, 0);
    },
  },

  // ---- reviews --------------------------------------------------------
  reviews: {
    async create(input: { job_id: string; reviewer_id: string; reviewee_id: string; rating: number; comment: string }): Promise<Review> {
      const result = await client().from('reviews').insert(input).select().single();
      notify();
      return unwrap<Review>(result);
    },
    async existsFor(jobId: string, reviewerId: string): Promise<boolean> {
      const { data } = await client().from('reviews').select('id').eq('job_id', jobId).eq('reviewer_id', reviewerId).maybeSingle();
      return !!data;
    },
  },

  notifications: {
    async listForUser(userId: string): Promise<Notification[]> {
      const { data } = await client()
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data as Notification[]) ?? [];
    },
    async unreadCount(userId: string): Promise<number> {
      const { count } = await client()
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null);
      return count ?? 0;
    },
    async markRead(id: string): Promise<void> {
      await client().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
      notify();
    },
    async markAllRead(userId: string): Promise<void> {
      await client().from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null);
      notify();
    },
  },

  push: {
    async subscribe(userId: string, sub: PushSubscriptionInput): Promise<void> {
      await client()
        .from('push_subscriptions')
        .upsert({ user_id: userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, { onConflict: 'endpoint' });
    },
    async unsubscribe(endpoint: string): Promise<void> {
      await client().from('push_subscriptions').delete().eq('endpoint', endpoint);
    },
  },

  moderation: {
    async createReport(input: { reporter_id: string; target_type: 'job' | 'user'; target_id: string; reason: string }): Promise<Report> {
      let targetUserId = input.target_id;
      if (input.target_type === 'job') {
        const { data } = await client().from('jobs').select('poster_id').eq('id', input.target_id).maybeSingle();
        targetUserId = (data as { poster_id: string } | null)?.poster_id ?? input.target_id;
      }
      const result = await client()
        .from('reports')
        .insert({ reporter_id: input.reporter_id, target_type: input.target_type, target_id: input.target_id, target_user_id: targetUserId, reason: input.reason })
        .select()
        .single();
      const report = unwrap<Report>(result);
      // Fire-and-forget server moderation agent
      void recsPost('/moderate', { report_id: report.id }).catch(() => {});
      return report;
    },
    async listReports(_callerId: string): Promise<Report[]> {
      const { data } = await client().from('reports').select('*').order('created_at', { ascending: false }).limit(60);
      return (data as Report[]) ?? [];
    },
    async listEvents(_callerId: string): Promise<ModerationEvent[]> {
      const { data } = await client().from('moderation_events').select('*').order('created_at', { ascending: false }).limit(60);
      return (data as ModerationEvent[]) ?? [];
    },
    async listActions(_callerId: string): Promise<ModerationAction[]> {
      const { data } = await client().from('moderation_actions').select('*').order('created_at', { ascending: false }).limit(60);
      return (data as ModerationAction[]) ?? [];
    },
    async adminBan(callerId: string, targetId: string, days: number, reason: string): Promise<void> {
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      await client().from('profiles').update({ banned_until: until, ban_reason: reason }).eq('id', targetId);
      await client().from('moderation_actions').insert({ decided_by: callerId, action: 'ban_user', target_user_id: targetId, reason, ban_until: until });
      notify();
    },
    async adminSuspend(callerId: string, targetId: string, reason: string): Promise<void> {
      await client().from('profiles').update({ suspended: true, ban_reason: reason }).eq('id', targetId);
      await client().from('moderation_actions').insert({ decided_by: callerId, action: 'suspend_user', target_user_id: targetId, reason });
      notify();
    },
    async adminUnban(callerId: string, targetId: string): Promise<void> {
      await client().from('profiles').update({ banned_until: null, suspended: false, ban_reason: null }).eq('id', targetId);
      await client().from('moderation_actions').insert({ decided_by: callerId, action: 'unban', target_user_id: targetId, reason: 'Lifted by admin.' });
      notify();
    },
  },

  // ---- recommendations -------------------------------------------------
  recommendations: {
    async listForUser(userId: string): Promise<JobRecommendation[]> {
      const { data, error } = await client()
        .from('recommendations')
        .select('score, rank, reason, job:jobs(*)')
        .eq('user_id', userId)
        .order('rank', { ascending: true });
      if (error) throw new Error(error.message);
      return ((data as unknown as { score: number; reason: string; job: Job | null }[]) ?? [])
        .filter((r) => r.job)
        .map((r) => ({ job: r.job as Job, reason: r.reason, score: r.score }));
    },
    async refresh(): Promise<{ ok: boolean }> {
      await recsPost('/refresh', {});
      notify();
      return { ok: true };
    },
  },

  // ---- private job preferences ----------------------------------------
  preferences: {
    async get(): Promise<JobPreferenceState> {
      return recsRequest<JobPreferenceState>('/preferences');
    },
    async update(input: { preferredCategories: string[]; hideLocation: boolean }): Promise<JobPreferenceState> {
      const result = await recsPost<JobPreferenceState>('/preferences', input);
      notify();
      return result;
    },
    async sendMessage(message: string): Promise<JobPreferenceState> {
      const result = await recsPost<JobPreferenceState>('/preferences/chat', { message });
      notify();
      return result;
    },
  },

  // ---- bots (admin demo data) -----------------------------------------
  bots: {
    async summon(count: number): Promise<{ profilesCreated: number; jobsCreated: number }> {
      const result = await recsPost<{ profilesCreated: number; jobsCreated: number }>('/bots', { count });
      notify();
      return result;
    },
    async remove(): Promise<{ removed: number }> {
      const result = await recsPost<{ removed: number }>('/bots/remove', {});
      notify();
      return result;
    },
  },
};
