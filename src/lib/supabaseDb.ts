import { supabase } from './supabase';
import type { Application, Conversation, Job, Message, Profile, Review } from '../types/models';
import type { Parish } from './constants';

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

export const db = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // ---- auth ----------------------------------------------------------
  auth: {
    async getSession(): Promise<Profile | null> {
      const { data } = await client().auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return null;
      const { data: profile } = await client().from('profiles').select('*').eq('id', userId).maybeSingle();
      return (profile as Profile | null) ?? null;
    },
    async signUp(input: { email: string; password: string; fullName: string; parish: Parish }): Promise<Profile> {
      const { data, error } = await client().auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { full_name: input.fullName, parish: input.parish } },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Check your inbox to confirm your email before continuing.');
      if (!data.session) {
        // Email confirmation is on for this project: the account exists but isn't signed in yet.
        // Don't pretend success — the caller would otherwise navigate to /onboarding as if logged
        // in, then bounce straight back to /login the moment a protected route re-checks the session.
        throw new Error('Account created — check your inbox for a confirmation link, then log in.');
      }
      // The handle_new_user trigger creates the profiles row; give it a moment then read it back.
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: profile } = await client().from('profiles').select('*').eq('id', data.user.id).maybeSingle();
        if (profile) {
          notify();
          return profile as Profile;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      throw new Error('Account created, but your profile is still being set up — try refreshing in a moment.');
    },
    async signIn(input: { email: string; password: string }): Promise<Profile> {
      const { data, error } = await client().auth.signInWithPassword({ email: input.email, password: input.password });
      if (error) throw new Error(error.message);
      const { data: profile, error: profileError } = await client().from('profiles').select('*').eq('id', data.user.id).single();
      if (profileError) throw new Error(profileError.message);
      notify();
      return profile as Profile;
    },
    async signOut(): Promise<void> {
      await client().auth.signOut();
      notify();
    },
  },

  // ---- profiles -------------------------------------------------------
  profiles: {
    async get(id: string): Promise<Profile | null> {
      const { data } = await client().from('profiles').select('*').eq('id', id).maybeSingle();
      return (data as Profile | null) ?? null;
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
      return (data as Job | null) ?? null;
    },
    async listByPoster(posterId: string): Promise<Job[]> {
      const { data } = await client().from('jobs').select('*').eq('poster_id', posterId).order('created_at', { ascending: false });
      return (data as Job[]) ?? [];
    },
    async listAssignedTo(questerId: string): Promise<Job[]> {
      const { data } = await client().from('jobs').select('*').eq('assigned_quester_id', questerId);
      return (data as Job[]) ?? [];
    },
    async create(input: Omit<Job, 'id' | 'created_at' | 'status' | 'assigned_quester_id'>): Promise<Job> {
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
      return db.jobs.update(id, { status: 'in_progress' });
    },
    async complete(id: string): Promise<Job> {
      return db.jobs.update(id, { status: 'completed' });
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
};
