import type { Application, Conversation, Job, Message, Profile, Review } from '../types/models';

/**
 * Local, browser-only stand-in for the Supabase backend described in TODO.md.
 * Same shapes, same business rules (one application per job, auto-reject on hire,
 * one review per job per reviewer, denormalised rating recompute) — swap this
 * module for real `@supabase/supabase-js` calls once a project is provisioned;
 * the hooks in src/hooks/* are the only callers, so nothing else has to change.
 */

interface State {
  profiles: Record<string, Profile>;
  jobs: Record<string, Job>;
  applications: Record<string, Application>;
  conversations: Record<string, Conversation>;
  messages: Record<string, Message>;
  reviews: Record<string, Review>;
  currentUserId: string | null;
}

const STORAGE_KEY = 'sidequest_state_v1';
const LATENCY = 220;

function genId(): string {
  return crypto.randomUUID();
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function seed(): State {
  const profiles: Profile[] = [
    {
      id: 'p-ellie',
      email: 'ellie.vibert@example.je',
      full_name: 'Ellie Vibert',
      avatar_url: null,
      bio: 'Keen gardener and dog lover, happy to help around St Helier.',
      parish: 'St Helier',
      phone: '07797 100 001',
      skills: ['Gardening', 'Pet care'],
      is_verified: true,
      is_admin: true,
      rating_avg: 5,
      rating_count: 1,
      jobs_posted_count: 2,
      jobs_completed_count: 1,
      created_at: daysFromNow(-120),
    },
    {
      id: 'p-tom',
      email: 'tom.lefeuvre@example.je',
      full_name: 'Tom Le Feuvre',
      avatar_url: null,
      bio: 'Handyman, 15 years on the island. Vans, tools, and a spare pair of hands.',
      parish: 'St Brelade',
      phone: '07797 100 002',
      skills: ['Handyman', 'Driving'],
      is_verified: true,
      is_admin: false,
      rating_avg: 5,
      rating_count: 1,
      jobs_posted_count: 0,
      jobs_completed_count: 2,
      created_at: daysFromNow(-200),
    },
    {
      id: 'p-sophie',
      email: 'sophie.degruchy@example.je',
      full_name: 'Sophie De Gruchy',
      avatar_url: null,
      bio: 'Uni student home for the summer, free most afternoons.',
      parish: 'Trinity',
      phone: null,
      skills: ['Tutoring', 'Tech help'],
      is_verified: false,
      is_admin: false,
      rating_avg: 0,
      rating_count: 0,
      jobs_posted_count: 2,
      jobs_completed_count: 0,
      created_at: daysFromNow(-30),
    },
    {
      id: 'p-marc',
      email: 'marc.renouf@example.je',
      full_name: 'Marc Renouf',
      avatar_url: null,
      bio: "Retired, out and about most days — glad of an excuse to leave the house.",
      parish: 'St Peter',
      phone: '07797 100 004',
      skills: ['Gardening', 'Cleaning'],
      is_verified: true,
      is_admin: false,
      rating_avg: 0,
      rating_count: 0,
      jobs_posted_count: 2,
      jobs_completed_count: 0,
      created_at: daysFromNow(-90),
    },
    {
      id: 'p-alice',
      email: 'alice.perchard@example.je',
      full_name: 'Alice Perchard',
      avatar_url: null,
      bio: 'Juggling two kids and a garden that has firmly won.',
      parish: 'Grouville',
      phone: null,
      skills: ['Childcare'],
      is_verified: false,
      is_admin: false,
      rating_avg: 0,
      rating_count: 0,
      jobs_posted_count: 2,
      jobs_completed_count: 0,
      created_at: daysFromNow(-15),
    },
    {
      id: 'p-ben',
      email: 'ben.falle@example.je',
      full_name: 'Ben Falle',
      avatar_url: null,
      bio: 'Between contracts on the building sites, happy to lend a back.',
      parish: 'St Lawrence',
      phone: '07797 100 006',
      skills: ['Handyman', 'Heavy lifting'],
      is_verified: false,
      is_admin: false,
      rating_avg: 0,
      rating_count: 0,
      jobs_posted_count: 0,
      jobs_completed_count: 0,
      created_at: daysFromNow(-10),
    },
  ];

  const jobs: Job[] = [
    {
      id: 'j-lawn',
      poster_id: 'p-alice',
      title: 'Mow the lawn and tidy the borders',
      description:
        "Back garden's got away from us — needs a mow, edges strimmed, and the borders along the fence tidied up. Mower and strimmer provided if you need them.",
      category: 'gardening',
      parish: 'Grouville',
      location_detail: 'Near Gorey Pier',
      budget_type: 'fixed',
      budget_amount: 35,
      estimated_hours: 2,
      date_needed: daysFromNow(4),
      is_flexible_date: true,
      status: 'open',
      assigned_quester_id: null,
      photos: [],
      created_at: daysFromNow(-2),
    },
    {
      id: 'j-shop',
      poster_id: 'p-marc',
      title: 'Weekly shop for my grandmother',
      description:
        "My grandmother is in St Peter and finds the walk to the shops tough these days. Looking for someone reliable to pick up her weekly shop from the list she'll give you — paid weekly.",
      category: 'shopping-errands',
      parish: 'St Peter',
      location_detail: null,
      budget_type: 'hourly',
      budget_amount: 12,
      estimated_hours: 1.5,
      date_needed: daysFromNow(1),
      is_flexible_date: true,
      status: 'open',
      assigned_quester_id: null,
      photos: [],
      created_at: daysFromNow(-1),
    },
    {
      id: 'j-sofa',
      poster_id: 'p-sophie',
      title: 'Help moving a sofa upstairs',
      description: 'Just moved in and the sofa will not go round the stairwell on my own. Need one more pair of hands for about half an hour.',
      category: 'moving-help',
      parish: 'Trinity',
      location_detail: null,
      budget_type: 'fixed',
      budget_amount: 25,
      estimated_hours: 1,
      date_needed: daysFromNow(2),
      is_flexible_date: false,
      status: 'assigned',
      assigned_quester_id: 'p-tom',
      photos: [],
      created_at: daysFromNow(-5),
    },
    {
      id: 'j-tap',
      poster_id: 'p-ellie',
      title: 'Fix a leaking kitchen tap',
      description: 'Kitchen tap has been dripping for a week. Needs a new washer or cartridge, whatever it turns out to be.',
      category: 'handyman',
      parish: 'St Helier',
      location_detail: 'Off Bath Street',
      budget_type: 'fixed',
      budget_amount: 40,
      estimated_hours: 1,
      date_needed: daysFromNow(-10),
      is_flexible_date: false,
      status: 'completed',
      assigned_quester_id: 'p-tom',
      photos: [],
      created_at: daysFromNow(-14),
    },
    {
      id: 'j-dog',
      poster_id: 'p-ben',
      title: 'Dog walking while I am at work',
      description: 'Need someone to walk a very friendly labrador most weekday lunchtimes for about 30 minutes.',
      category: 'pet-care',
      parish: 'St Lawrence',
      location_detail: null,
      budget_type: 'hourly',
      budget_amount: 10,
      estimated_hours: 0.5,
      date_needed: daysFromNow(3),
      is_flexible_date: true,
      status: 'open',
      assigned_quester_id: null,
      photos: [],
      created_at: daysFromNow(-3),
    },
    {
      id: 'j-laptop',
      poster_id: 'p-marc',
      title: 'Laptop running slow, needs a check-up',
      description: 'Old laptop has ground to a halt. Probably just needs a clear out and an update, not looking to buy a new one.',
      category: 'tech-help',
      parish: 'St Peter',
      location_detail: null,
      budget_type: 'negotiable',
      budget_amount: null,
      estimated_hours: 1,
      date_needed: daysFromNow(7),
      is_flexible_date: true,
      status: 'open',
      assigned_quester_id: null,
      photos: [],
      created_at: daysFromNow(-1),
    },
    {
      id: 'j-garage',
      poster_id: 'p-alice',
      title: 'Clear out the garage',
      description: 'Years of clutter to sort into keep, tip, and charity shop piles. Trailer available for the tip run.',
      category: 'other',
      parish: 'Grouville',
      location_detail: null,
      budget_type: 'hourly',
      budget_amount: 11,
      estimated_hours: 3,
      date_needed: daysFromNow(0),
      is_flexible_date: true,
      status: 'in_progress',
      assigned_quester_id: 'p-ben',
      photos: [],
      created_at: daysFromNow(-6),
    },
    {
      id: 'j-tutor',
      poster_id: 'p-ellie',
      title: 'GCSE maths tutoring, twice a week',
      description: 'Looking for a patient tutor for my son ahead of his GCSEs this year. Ideally twice a week after school.',
      category: 'tutoring',
      parish: 'St Helier',
      location_detail: null,
      budget_type: 'hourly',
      budget_amount: 15,
      estimated_hours: 1,
      date_needed: daysFromNow(5),
      is_flexible_date: true,
      status: 'open',
      assigned_quester_id: null,
      photos: [],
      created_at: daysFromNow(-4),
    },
    {
      id: 'j-fence',
      poster_id: 'p-sophie',
      title: 'Paint the garden fence',
      description: 'Fence needs a coat of preservative before winter.',
      category: 'handyman',
      parish: 'Trinity',
      location_detail: null,
      budget_type: 'fixed',
      budget_amount: 30,
      estimated_hours: 2,
      date_needed: daysFromNow(-2),
      is_flexible_date: true,
      status: 'cancelled',
      assigned_quester_id: null,
      photos: [],
      created_at: daysFromNow(-9),
    },
  ];

  const applications: Application[] = [
    {
      id: 'a-1',
      job_id: 'j-lawn',
      quester_id: 'p-tom',
      message: "Happy to help — I've got my own strimmer too. Can do Thursday morning.",
      proposed_amount: null,
      status: 'pending',
      created_at: daysFromNow(-1),
    },
    {
      id: 'a-2',
      job_id: 'j-lawn',
      quester_id: 'p-ben',
      message: 'I could do this Wednesday afternoon if that works.',
      proposed_amount: 30,
      status: 'pending',
      created_at: daysFromNow(-1),
    },
    {
      id: 'a-3',
      job_id: 'j-shop',
      quester_id: 'p-ellie',
      message: "I'm in St Peter most Tuesdays, glad to help out.",
      proposed_amount: null,
      status: 'pending',
      created_at: daysFromNow(0),
    },
    {
      id: 'a-4',
      job_id: 'j-sofa',
      quester_id: 'p-tom',
      message: 'Done plenty of these, no bother. Free tomorrow evening.',
      proposed_amount: null,
      status: 'accepted',
      created_at: daysFromNow(-4),
    },
    {
      id: 'a-5',
      job_id: 'j-tap',
      quester_id: 'p-tom',
      message: 'Sounds like a cartridge job, I can bring a few sizes and sort it on the spot.',
      proposed_amount: null,
      status: 'accepted',
      created_at: daysFromNow(-13),
    },
    {
      id: 'a-6',
      job_id: 'j-garage',
      quester_id: 'p-ben',
      message: 'Got a van and a strong back, can start this weekend.',
      proposed_amount: null,
      status: 'accepted',
      created_at: daysFromNow(-5),
    },
  ];

  const conversations: Conversation[] = [
    { id: 'c-sofa', job_id: 'j-sofa', poster_id: 'p-sophie', quester_id: 'p-tom', last_message_at: daysFromNow(-3), created_at: daysFromNow(-4) },
    { id: 'c-tap', job_id: 'j-tap', poster_id: 'p-ellie', quester_id: 'p-tom', last_message_at: daysFromNow(-11), created_at: daysFromNow(-13) },
    { id: 'c-garage', job_id: 'j-garage', poster_id: 'p-alice', quester_id: 'p-ben', last_message_at: daysFromNow(-1), created_at: daysFromNow(-5) },
  ];

  const messages: Message[] = [
    { id: 'm-1', conversation_id: 'c-tap', sender_id: 'p-ellie', body: 'Hi Tom, thanks for taking this on — front door will be open.', read_at: daysFromNow(-13), created_at: daysFromNow(-13) },
    { id: 'm-2', conversation_id: 'c-tap', sender_id: 'p-tom', body: 'No problem, all sorted — new cartridge fitted and tested.', read_at: daysFromNow(-11), created_at: daysFromNow(-11) },
    { id: 'm-3', conversation_id: 'c-tap', sender_id: 'p-ellie', body: 'Brilliant, thank you! Not dripped since.', read_at: daysFromNow(-11), created_at: daysFromNow(-11) },
    { id: 'm-4', conversation_id: 'c-sofa', sender_id: 'p-sophie', body: 'Great, thank you — I am on the top floor, number 12.', read_at: daysFromNow(-3), created_at: daysFromNow(-3) },
    { id: 'm-5', conversation_id: 'c-sofa', sender_id: 'p-tom', body: "See you Thursday at 6, I'll bring a mate to help carry.", read_at: null, created_at: daysFromNow(-3) },
    { id: 'm-6', conversation_id: 'c-garage', sender_id: 'p-alice', body: 'Trailer is round the side, help yourself whenever suits.', read_at: daysFromNow(-1), created_at: daysFromNow(-1) },
  ];

  const reviews: Review[] = [
    {
      id: 'r-1',
      job_id: 'j-tap',
      reviewer_id: 'p-ellie',
      reviewee_id: 'p-tom',
      rating: 5,
      comment: 'Great work, fixed it fast and cleaned up after himself. Would call again.',
      created_at: daysFromNow(-11),
    },
    {
      id: 'r-2',
      job_id: 'j-tap',
      reviewer_id: 'p-tom',
      reviewee_id: 'p-ellie',
      rating: 5,
      comment: 'Friendly, clear about what needed doing, paid on the spot.',
      created_at: daysFromNow(-11),
    },
  ];

  return {
    profiles: Object.fromEntries(profiles.map((p) => [p.id, p])),
    jobs: Object.fromEntries(jobs.map((j) => [j.id, j])),
    applications: Object.fromEntries(applications.map((a) => [a.id, a])),
    conversations: Object.fromEntries(conversations.map((c) => [c.id, c])),
    messages: Object.fromEntries(messages.map((m) => [m.id, m])),
    reviews: Object.fromEntries(reviews.map((r) => [r.id, r])),
    currentUserId: null,
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // fall through to reseed
  }
  const fresh = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

let state: State = load();

function persist(next: State) {
  state = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function touch() {
  persist(state);
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

function assertAdmin(callerId: string) {
  if (!state.profiles[callerId]?.is_admin) throw new Error('Admins only.');
}

export const db = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // ---- auth ----------------------------------------------------------
  auth: {
    async getSession(): Promise<Profile | null> {
      return delay(state.currentUserId ? state.profiles[state.currentUserId] ?? null : null);
    },
    async signUp(input: { email: string; password: string; fullName: string; parish: Profile['parish'] }): Promise<Profile> {
      const existing = Object.values(state.profiles).find((p) => p.email.toLowerCase() === input.email.toLowerCase());
      if (existing) throw new Error('An account with that email already exists.');
      const id = genId();
      const isFirstEver = Object.keys(state.profiles).length === 0;
      const profile: Profile = {
        id,
        email: input.email,
        full_name: input.fullName,
        avatar_url: null,
        bio: '',
        parish: input.parish,
        phone: null,
        skills: [],
        is_verified: false,
        is_admin: isFirstEver,
        rating_avg: 0,
        rating_count: 0,
        jobs_posted_count: 0,
        jobs_completed_count: 0,
        created_at: new Date().toISOString(),
      };
      state.profiles[id] = profile;
      state.currentUserId = id;
      touch();
      notify();
      return delay(profile);
    },
    async signIn(input: { email: string }): Promise<Profile> {
      const profile = Object.values(state.profiles).find((p) => p.email.toLowerCase() === input.email.toLowerCase());
      if (!profile) throw new Error('No account found with that email — try signing up instead.');
      state.currentUserId = profile.id;
      touch();
      notify();
      return delay(profile);
    },
    async signOut(): Promise<void> {
      state.currentUserId = null;
      touch();
      notify();
      return delay(undefined);
    },
  },

  // ---- profiles -------------------------------------------------------
  profiles: {
    async get(id: string): Promise<Profile | null> {
      return delay(state.profiles[id] ?? null);
    },
    async update(id: string, patch: Partial<Profile>): Promise<Profile> {
      const current = state.profiles[id];
      if (!current) throw new Error('Profile not found.');
      const next = { ...current, ...patch };
      state.profiles[id] = next;
      touch();
      notify();
      return delay(next);
    },
    async reviewsFor(profileId: string): Promise<Review[]> {
      return delay(
        Object.values(state.reviews)
          .filter((r) => r.reviewee_id === profileId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    },
    async listAll(callerId: string): Promise<Profile[]> {
      assertAdmin(callerId);
      return delay(Object.values(state.profiles).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    },
    async setAdmin(callerId: string, targetId: string, isAdmin: boolean): Promise<Profile> {
      assertAdmin(callerId);
      const target = state.profiles[targetId];
      if (!target) throw new Error('Profile not found.');
      const next = { ...target, is_admin: isAdmin };
      state.profiles[targetId] = next;
      touch();
      notify();
      return delay(next);
    },
  },

  // ---- jobs -----------------------------------------------------------
  jobs: {
    async list(filters?: { search?: string; category?: string; parish?: string; status?: string }): Promise<Job[]> {
      let jobs = Object.values(state.jobs);
      if (filters?.status) jobs = jobs.filter((j) => j.status === filters.status);
      else jobs = jobs.filter((j) => j.status !== 'cancelled');
      if (filters?.category) jobs = jobs.filter((j) => j.category === filters.category);
      if (filters?.parish) jobs = jobs.filter((j) => j.parish === filters.parish);
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        jobs = jobs.filter((j) => j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q));
      }
      return delay(jobs.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async get(id: string): Promise<Job | null> {
      return delay(state.jobs[id] ?? null);
    },
    async listByPoster(posterId: string): Promise<Job[]> {
      return delay(
        Object.values(state.jobs)
          .filter((j) => j.poster_id === posterId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    },
    async listAssignedTo(questerId: string): Promise<Job[]> {
      return delay(Object.values(state.jobs).filter((j) => j.assigned_quester_id === questerId));
    },
    async create(input: Omit<Job, 'id' | 'created_at' | 'status' | 'assigned_quester_id'>): Promise<Job> {
      const id = genId();
      const job: Job = { ...input, id, status: 'open', assigned_quester_id: null, created_at: new Date().toISOString() };
      state.jobs[id] = job;
      const poster = state.profiles[input.poster_id];
      if (poster) state.profiles[input.poster_id] = { ...poster, jobs_posted_count: poster.jobs_posted_count + 1 };
      touch();
      notify();
      return delay(job);
    },
    async update(id: string, patch: Partial<Job>): Promise<Job> {
      const current = state.jobs[id];
      if (!current) throw new Error('Job not found.');
      const next = { ...current, ...patch };
      state.jobs[id] = next;
      touch();
      notify();
      return delay(next);
    },
    async cancel(id: string): Promise<Job> {
      return this.update(id, { status: 'cancelled' });
    },
    async markInProgress(id: string): Promise<Job> {
      return this.update(id, { status: 'in_progress' });
    },
    async complete(id: string): Promise<Job> {
      const job = state.jobs[id];
      if (!job) throw new Error('Job not found.');
      const next = { ...job, status: 'completed' as const };
      state.jobs[id] = next;
      const poster = state.profiles[job.poster_id];
      if (poster) state.profiles[job.poster_id] = { ...poster, jobs_completed_count: poster.jobs_completed_count + 1 };
      if (job.assigned_quester_id) {
        const quester = state.profiles[job.assigned_quester_id];
        if (quester) state.profiles[job.assigned_quester_id] = { ...quester, jobs_completed_count: quester.jobs_completed_count + 1 };
      }
      touch();
      notify();
      return delay(next);
    },
    async listAllAdmin(callerId: string): Promise<Job[]> {
      assertAdmin(callerId);
      return delay(Object.values(state.jobs).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async adminDelete(callerId: string, jobId: string): Promise<void> {
      assertAdmin(callerId);
      delete state.jobs[jobId];
      Object.values(state.applications)
        .filter((a) => a.job_id === jobId)
        .forEach((a) => delete state.applications[a.id]);
      const conversationIds = Object.values(state.conversations)
        .filter((c) => c.job_id === jobId)
        .map((c) => c.id);
      conversationIds.forEach((id) => delete state.conversations[id]);
      Object.values(state.messages)
        .filter((m) => conversationIds.includes(m.conversation_id))
        .forEach((m) => delete state.messages[m.id]);
      Object.values(state.reviews)
        .filter((r) => r.job_id === jobId)
        .forEach((r) => delete state.reviews[r.id]);
      touch();
      notify();
      return delay(undefined);
    },
  },

  // ---- applications -----------------------------------------------------
  applications: {
    async listByJob(jobId: string): Promise<Application[]> {
      return delay(
        Object.values(state.applications)
          .filter((a) => a.job_id === jobId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    },
    async listByQuester(questerId: string): Promise<Application[]> {
      return delay(
        Object.values(state.applications)
          .filter((a) => a.quester_id === questerId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    },
    async create(input: { job_id: string; quester_id: string; message: string; proposed_amount: number | null }): Promise<Application> {
      const job = state.jobs[input.job_id];
      if (!job) throw new Error('Job not found.');
      if (job.poster_id === input.quester_id) throw new Error('You cannot apply to your own job.');
      const dupe = Object.values(state.applications).find((a) => a.job_id === input.job_id && a.quester_id === input.quester_id);
      if (dupe) throw new Error('You have already applied to this job.');
      const id = genId();
      const application: Application = { ...input, id, status: 'pending', created_at: new Date().toISOString() };
      state.applications[id] = application;

      const convId = genId();
      state.conversations[convId] = {
        id: convId,
        job_id: input.job_id,
        poster_id: job.poster_id,
        quester_id: input.quester_id,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      if (input.message) {
        const msgId = genId();
        state.messages[msgId] = {
          id: msgId,
          conversation_id: convId,
          sender_id: input.quester_id,
          body: input.message,
          read_at: null,
          created_at: new Date().toISOString(),
        };
      }
      touch();
      notify();
      return delay(application);
    },
    async withdraw(id: string): Promise<Application> {
      const app = state.applications[id];
      if (!app) throw new Error('Application not found.');
      const next = { ...app, status: 'withdrawn' as const };
      state.applications[id] = next;
      touch();
      notify();
      return delay(next);
    },
    async accept(id: string): Promise<Application> {
      const app = state.applications[id];
      if (!app) throw new Error('Application not found.');
      const job = state.jobs[app.job_id];
      if (!job) throw new Error('Job not found.');

      Object.values(state.applications)
        .filter((a) => a.job_id === app.job_id)
        .forEach((a) => {
          state.applications[a.id] = { ...a, status: a.id === id ? 'accepted' : a.status === 'pending' ? 'rejected' : a.status };
        });
      state.jobs[job.id] = { ...job, status: 'assigned', assigned_quester_id: app.quester_id };
      touch();
      notify();
      return delay(state.applications[id]);
    },
    async reject(id: string): Promise<Application> {
      const app = state.applications[id];
      if (!app) throw new Error('Application not found.');
      const next = { ...app, status: 'rejected' as const };
      state.applications[id] = next;
      touch();
      notify();
      return delay(next);
    },
  },

  // ---- conversations & messages ------------------------------------------
  conversations: {
    async listForUser(userId: string): Promise<Conversation[]> {
      return delay(
        Object.values(state.conversations)
          .filter((c) => c.poster_id === userId || c.quester_id === userId)
          .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)),
      );
    },
    async get(id: string): Promise<Conversation | null> {
      return delay(state.conversations[id] ?? null);
    },
    async listForUserEnriched(userId: string): Promise<
      Array<{ conversation: Conversation; counterpart: Profile | null; job: Job | null; lastMessage: Message | null; unread: boolean }>
    > {
      const rows = Object.values(state.conversations)
        .filter((c) => c.poster_id === userId || c.quester_id === userId)
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
        .map((conversation) => {
          const counterpartId = conversation.poster_id === userId ? conversation.quester_id : conversation.poster_id;
          const convMessages = Object.values(state.messages)
            .filter((m) => m.conversation_id === conversation.id)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          const lastMessage = convMessages[convMessages.length - 1] ?? null;
          const unread = convMessages.some((m) => m.sender_id !== userId && !m.read_at);
          return {
            conversation,
            counterpart: state.profiles[counterpartId] ?? null,
            job: state.jobs[conversation.job_id] ?? null,
            lastMessage,
            unread,
          };
        });
      return delay(rows);
    },
    async getOrCreateForJob(jobId: string, posterId: string, questerId: string): Promise<Conversation> {
      const existing = Object.values(state.conversations).find((c) => c.job_id === jobId && c.quester_id === questerId);
      if (existing) return delay(existing);
      const id = genId();
      const conv: Conversation = { id, job_id: jobId, poster_id: posterId, quester_id: questerId, last_message_at: new Date().toISOString(), created_at: new Date().toISOString() };
      state.conversations[id] = conv;
      touch();
      notify();
      return delay(conv);
    },
  },

  messages: {
    async listByConversation(conversationId: string): Promise<Message[]> {
      return delay(
        Object.values(state.messages)
          .filter((m) => m.conversation_id === conversationId)
          .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      );
    },
    async send(conversationId: string, senderId: string, body: string): Promise<Message> {
      const id = genId();
      const message: Message = { id, conversation_id: conversationId, sender_id: senderId, body, read_at: null, created_at: new Date().toISOString() };
      state.messages[id] = message;
      const conv = state.conversations[conversationId];
      if (conv) state.conversations[conversationId] = { ...conv, last_message_at: message.created_at };
      touch();
      notify();
      return delay(message);
    },
    async markRead(conversationId: string, readerId: string): Promise<void> {
      Object.values(state.messages)
        .filter((m) => m.conversation_id === conversationId && m.sender_id !== readerId && !m.read_at)
        .forEach((m) => {
          state.messages[m.id] = { ...m, read_at: new Date().toISOString() };
        });
      touch();
      notify();
      return delay(undefined);
    },
    async unreadCountForUser(userId: string): Promise<number> {
      const myConvIds = new Set(Object.values(state.conversations).filter((c) => c.poster_id === userId || c.quester_id === userId).map((c) => c.id));
      return delay(Object.values(state.messages).filter((m) => myConvIds.has(m.conversation_id) && m.sender_id !== userId && !m.read_at).length);
    },
  },

  // ---- reviews --------------------------------------------------------
  reviews: {
    async create(input: { job_id: string; reviewer_id: string; reviewee_id: string; rating: number; comment: string }): Promise<Review> {
      const dupe = Object.values(state.reviews).find((r) => r.job_id === input.job_id && r.reviewer_id === input.reviewer_id);
      if (dupe) throw new Error('You have already reviewed this job.');
      const id = genId();
      const review: Review = { ...input, id, created_at: new Date().toISOString() };
      state.reviews[id] = review;

      const reviewee = state.profiles[input.reviewee_id];
      if (reviewee) {
        const newCount = reviewee.rating_count + 1;
        const newAvg = (reviewee.rating_avg * reviewee.rating_count + input.rating) / newCount;
        state.profiles[input.reviewee_id] = { ...reviewee, rating_avg: Math.round(newAvg * 10) / 10, rating_count: newCount };
      }
      touch();
      notify();
      return delay(review);
    },
    async existsFor(jobId: string, reviewerId: string): Promise<boolean> {
      return delay(Object.values(state.reviews).some((r) => r.job_id === jobId && r.reviewer_id === reviewerId));
    },
  },
};

export function currentUserId(): string | null {
  return state.currentUserId;
}

export type Repo = typeof db;
