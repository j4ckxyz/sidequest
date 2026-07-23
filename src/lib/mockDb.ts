import type {
  Application,
  Conversation,
  Job,
  JobPreferenceMessage,
  JobPreferenceState,
  JobRecommendation,
  Message,
  ModerationAction,
  ModerationDecision,
  ModerationEvent,
  Notification,
  NotificationType,
  Profile,
  PushSubscriptionInput,
  Report,
  Review,
} from '../types/models';
import { PARISHES, JOB_CATEGORIES, SKILL_OPTIONS } from './constants';

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
  notifications: Record<string, Notification>;
  reports: Record<string, Report>;
  moderationActions: Record<string, ModerationAction>;
  moderationEvents: Record<string, ModerationEvent>;
  /** past username (lowercased) → owner id, so old @handles keep resolving. */
  usernameHistory: Record<string, string>;
  jobPreferences: Record<string, Omit<JobPreferenceState, 'messages' | 'remaining_today' | 'daily_limit'>>;
  jobPreferenceMessages: Record<string, JobPreferenceMessage[]>;
  currentUserId: string | null;
}

const STORAGE_KEY = 'sidequest_state_v1';
const LATENCY = 220;

function genId(): string {
  return crypto.randomUUID();
}

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function base62(n: number): string {
  if (n <= 0) return '0';
  let out = '';
  while (n > 0) {
    out = BASE62[n % 62] + out;
    n = Math.floor(n / 62);
  }
  return out;
}
let publicIdSeq = 0;
/** Mock stand-in for the Postgres snowflake→base62 generator: time-ordered + a
 *  rolling sequence so ids are unique, short, and sort by age. */
function genPublicId(): string {
  const epoch = 1704067200000; // 2024-01-01
  return base62((Date.now() - epoch) * 8192 + (publicIdSeq++ % 8192));
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
  const profiles: Profile[] = ([
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
    {
      // Demo bad actor — obvious scam posts + a prior removal on record, so a
      // fresh report makes the moderation agent escalate to a ban on stage.
      id: 'p-spam',
      email: 'deals@totally-legit.example',
      full_name: 'Deals Direct',
      avatar_url: null,
      bio: 'DM me on WhatsApp for GUARANTEED money-making deals. Crypto investment, fast cash, no questions asked!!!',
      parish: 'St Helier',
      phone: '07700 000 000',
      skills: [],
      is_verified: false,
      is_admin: false,
      rating_avg: 0,
      rating_count: 0,
      jobs_posted_count: 2,
      jobs_completed_count: 0,
      created_at: daysFromNow(-3),
    },
  ] as Omit<
    Profile,
    'onboarded' | 'username' | 'top_category' | 'is_owner' | 'is_bot' | 'interest_keywords' | 'hide_location' | 'saved_pins' | 'banned_until' | 'suspended' | 'ban_reason'
  >[]).map((p) => ({
    ...p,
    onboarded: true,
    username: p.full_name.toLowerCase().split(' ')[0],
    top_category: null,
    is_owner: p.is_admin,
    is_bot: false,
    interest_keywords: [],
    hide_location: false,
    saved_pins: [],
    banned_until: null,
    suspended: false,
    ban_reason: null,
  }));

  const jobs: Job[] = ([
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
    {
      id: 'j-scam1',
      poster_id: 'p-spam',
      title: 'EARN £500/day from home — no experience!!!',
      description:
        'Guaranteed crypto investment returns. Send me a small deposit via gift card or bitcoin first and I DOUBLE it. WhatsApp me on 07700 000 000, click here www.totally-legit.example. Fast cash, act now!',
      category: 'other',
      parish: 'St Helier',
      location_detail: null,
      budget_type: 'negotiable',
      budget_amount: null,
      estimated_hours: null,
      date_needed: null,
      is_flexible_date: true,
      status: 'open',
      assigned_quester_id: null,
      photos: [],
      created_at: daysFromNow(-1),
    },
  ] as Omit<Job, 'is_recurring' | 'recurrence' | 'location_lat' | 'location_lng' | 'slots' | 'public_id'>[]).map((j) => ({
    ...j,
    // Stable, readable public ids for the seed data (real jobs get a base62 snowflake).
    public_id: j.id.replace(/^j-/, ''),
    slots: 1,
    is_recurring: false,
    recurrence: null,
    location_lat: null,
    location_lng: null,
  }));

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
    notifications: {},
    reports: {},
    // One prior removal on the demo bad actor so a new report escalates to a ban.
    moderationActions: {
      'ma-seed-1': {
        id: 'ma-seed-1',
        report_id: null,
        decided_by: 'gemini',
        action: 'remove_post',
        target_user_id: 'p-spam',
        job_id: null,
        reason: 'Previous listing removed: off-platform payment scam and spam links.',
        ban_until: null,
        created_at: daysFromNow(-2),
      },
    },
    moderationEvents: {},
    usernameHistory: {},
    jobPreferences: {},
    jobPreferenceMessages: {},
    currentUserId: null,
  };
}

function safeGetItem(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // ignore in non-browser environments
  }
}

function load(): State {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      const profiles = Object.values(parsed.profiles);
      const ownerId = profiles.find((profile) => profile.is_owner)?.id
        ?? profiles.filter((profile) => profile.is_admin).sort((a, b) => a.created_at.localeCompare(b.created_at))[0]?.id;
      parsed.profiles = Object.fromEntries(
        profiles.map((profile) => [
          profile.id,
          {
            ...profile,
            is_owner: profile.id === ownerId,
            is_bot: profile.is_bot ?? false,
            interest_keywords: profile.interest_keywords ?? [],
            hide_location: profile.hide_location ?? false,
            saved_pins: profile.saved_pins ?? [],
            banned_until: profile.banned_until ?? null,
            suspended: profile.suspended ?? false,
            ban_reason: profile.ban_reason ?? null,
          },
        ]),
      );
      parsed.jobs = Object.fromEntries(
        Object.values(parsed.jobs).map((job) => [
          job.id,
          {
            ...job,
            public_id: job.public_id ?? job.id.replace(/^j-/, ''),
            slots: job.slots ?? 1,
            is_recurring: job.is_recurring ?? false,
            recurrence: job.recurrence ?? null,
            location_lat: job.location_lat ?? null,
            location_lng: job.location_lng ?? null,
          },
        ]),
      );
      parsed.notifications ??= {};
      parsed.reports ??= {};
      parsed.moderationActions ??= {};
      parsed.moderationEvents ??= {};
      parsed.usernameHistory ??= {};
      parsed.jobPreferences ??= {};
      parsed.jobPreferenceMessages ??= {};
      return parsed;
    }
  } catch {
    // fall through to reseed
  }
  const fresh = seed();
  safeSetItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

let state: State = load();

function persist(next: State) {
  state = next;
  safeSetItem(STORAGE_KEY, JSON.stringify(next));
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

/** Mock equivalent of the DB notification triggers — creates an in-app notification
 *  (skipping self-notifications). Prod does this with Postgres triggers (migration 0014). */
function emitNotification(
  recipientId: string,
  type: NotificationType,
  fields: { title: string; body: string; link: string; jobId?: string | null; actorId?: string | null },
) {
  if (!recipientId || recipientId === fields.actorId) return;
  const id = genId();
  state.notifications[id] = {
    id,
    recipient_id: recipientId,
    type,
    title: fields.title,
    body: fields.body,
    link: fields.link,
    job_id: fields.jobId ?? null,
    actor_id: fields.actorId ?? null,
    read_at: null,
    created_at: new Date().toISOString(),
  };
}

function actorName(id: string): string {
  return state.profiles[id]?.full_name ?? 'Someone';
}

// ── Moderation (mock stand-in for the server-side Gemini agent) ────────────
// A deterministic classifier + streamed status steps so the whole report →
// decide → act → live-feed flow works in `bun run dev`. Prod runs the real
// Gemini agent (server/moderation.ts) which writes the same rows.

const SEVERE_TERMS = [
  'crypto', 'bitcoin', 'gift card', 'wire transfer', 'western union', 'guaranteed money',
  'guaranteed', 'double it', 'investment', 'send money', 'deposit first', 'escort', 'onlyfans',
  'nsfw', 'weapon', 'drugs', 'sugar daddy', 'sugar baby',
];
const SPAM_TERMS = ['whatsapp me', 'dm me', 'telegram', 'click here', 'http://', 'https://', 'www.', 'subscribe', 'follow my', 'act now', 'no experience'];

function classifyContent(text: string): { severity: 'none' | 'spam' | 'severe'; matched: string[] } {
  const t = text.toLowerCase();
  const severe = SEVERE_TERMS.filter((k) => t.includes(k));
  const spam = SPAM_TERMS.filter((k) => t.includes(k));
  if (severe.length) return { severity: 'severe', matched: [...severe, ...spam] };
  if (spam.length >= 2) return { severity: 'spam', matched: spam };
  return { severity: 'none', matched: [] };
}

function priorSeriousActions(userId: string): number {
  return Object.values(state.moderationActions).filter(
    (a) => a.target_user_id === userId && (a.action === 'remove_post' || a.action === 'ban_user' || a.action === 'suspend_user'),
  ).length;
}

function addModEvent(reportId: string, kind: ModerationEvent['kind'], message: string) {
  const id = genId();
  state.moderationEvents[id] = { id, report_id: reportId, kind, message, created_at: new Date().toISOString() };
  touch();
  notify();
}

function logModAction(
  reportId: string | null,
  decidedBy: string,
  action: ModerationDecision,
  targetUserId: string,
  jobId: string | null,
  reason: string,
  banUntil: string | null,
) {
  const id = genId();
  state.moderationActions[id] = {
    id,
    report_id: reportId,
    decided_by: decidedBy,
    action,
    target_user_id: targetUserId,
    job_id: jobId,
    reason,
    ban_until: banUntil,
    created_at: new Date().toISOString(),
  };
}

function applyRemovePost(jobId: string, reportId: string, decidedBy: string, reason: string) {
  const job = state.jobs[jobId];
  if (!job) return;
  // Cascade: drop the job's applications, conversations, and their messages.
  Object.values(state.applications).filter((a) => a.job_id === jobId).forEach((a) => delete state.applications[a.id]);
  const convIds = Object.values(state.conversations).filter((c) => c.job_id === jobId).map((c) => c.id);
  convIds.forEach((cid) => {
    Object.values(state.messages).filter((m) => m.conversation_id === cid).forEach((m) => delete state.messages[m.id]);
    delete state.conversations[cid];
  });
  delete state.jobs[jobId];
  logModAction(reportId, decidedBy, 'remove_post', job.poster_id, jobId, reason, null);
}

function applyBan(userId: string, days: number, reportId: string | null, decidedBy: string, reason: string) {
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const p = state.profiles[userId];
  if (p) state.profiles[userId] = { ...p, banned_until: until, ban_reason: reason };
  logModAction(reportId, decidedBy, 'ban_user', userId, null, reason, until);
}

function applySuspend(userId: string, reportId: string | null, decidedBy: string, reason: string) {
  const p = state.profiles[userId];
  if (p) state.profiles[userId] = { ...p, suspended: true, ban_reason: reason };
  logModAction(reportId, decidedBy, 'suspend_user', userId, null, reason, null);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fire-and-forget: stream the agent's steps and enforce a decision. */
async function runModerationAgent(report: Report) {
  const targetId = report.target_user_id;
  const target = state.profiles[targetId];
  const content =
    report.target_type === 'job'
      ? (() => {
          const j = state.jobs[report.target_id];
          return j ? `${j.title}\n${j.description}` : '';
        })()
      : target
        ? `${target.full_name}\n${target.bio}`
        : '';

  state.reports[report.id] = { ...report, status: 'reviewing' };
  addModEvent(report.id, 'received', `Report received on a ${report.target_type} — “${report.reason || 'no reason given'}”. Starting review.`);
  await wait(650);

  const priors = priorSeriousActions(targetId);
  addModEvent(
    report.id,
    'context',
    `Pulled ${target?.full_name ?? 'the user'}'s record: ${priors} prior enforcement action${priors === 1 ? '' : 's'}, ${target?.rating_count ?? 0} reviews, joined ${target ? new Date(target.created_at).toLocaleDateString('en-GB') : '—'}.`,
  );
  await wait(800);

  addModEvent(report.id, 'analyzing', 'Checking the content against the rules: scams, off-platform payment, spam links, harassment…');
  await wait(950);

  const { severity, matched } = classifyContent(content);
  const flagged = matched.length ? ` Flagged: ${matched.slice(0, 4).join(', ')}.` : '';

  const decisions: { action: ModerationDecision; reason: string; days?: number }[] = [];
  if (severity === 'none') {
    decisions.push({ action: 'dismiss', reason: 'Content is within the community rules — no action taken.' });
  } else {
    if (report.target_type === 'job') {
      decisions.push({
        action: 'remove_post',
        reason: `Listing removed — ${severity === 'severe' ? 'off-platform payment scam' : 'spam / solicitation'}.${flagged}`,
      });
    }
    if (severity === 'severe' && priors >= 1) {
      decisions.push({ action: 'suspend_user', reason: `Repeat serious violation after a prior action — account suspended pending human review.${flagged}` });
    } else if (severity === 'severe') {
      decisions.push({ action: 'ban_user', days: 30, reason: `Serious violation (scam) — 30-day ban.${flagged}` });
    } else if (priors >= 1) {
      decisions.push({ action: 'ban_user', days: 7, reason: `Repeat spam after a prior removal — 7-day ban.${flagged}` });
    }
  }

  addModEvent(report.id, 'decision', `Decision: ${decisions.map((d) => d.action.replace('_', ' ')).join(' + ')}.`);
  await wait(700);

  for (const d of decisions) {
    if (d.action === 'remove_post' && report.target_type === 'job') applyRemovePost(report.target_id, report.id, 'gemini', d.reason);
    else if (d.action === 'ban_user') applyBan(targetId, d.days ?? 7, report.id, 'gemini', d.reason);
    else if (d.action === 'suspend_user') applySuspend(targetId, report.id, 'gemini', d.reason);
    else logModAction(report.id, 'gemini', 'dismiss', targetId, null, d.reason, null);
    addModEvent(report.id, 'applied', d.reason);
    await wait(550);
  }

  state.reports[report.id] = { ...state.reports[report.id], status: 'resolved' };
  addModEvent(report.id, 'done', 'Review complete.');
  touch();
  notify();
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
    // Dev stand-in for Google OAuth: sign straight into the demo account (Ellie, an admin
    // in the seed) so the mock backend exercises the whole signed-in app without real OAuth.
    async signInWithGoogle(_next?: string): Promise<void> {
      const demo = Object.values(state.profiles).find((p) => p.email === 'ellie.vibert@example.je') ?? Object.values(state.profiles)[0];
      if (demo) {
        state.currentUserId = demo.id;
        touch();
        notify();
      }
      return delay(undefined);
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
    async getMany(ids: string[]): Promise<Profile[]> {
      const set = new Set(ids);
      return delay(Object.values(state.profiles).filter((p) => set.has(p.id)));
    },
    async getByUsername(username: string): Promise<Profile | null> {
      const u = username.toLowerCase();
      const current = Object.values(state.profiles).find((p) => p.username?.toLowerCase() === u);
      if (current) return delay(current);
      const ownerId = (state.usernameHistory ?? {})[u];
      return delay(ownerId ? state.profiles[ownerId] ?? null : null);
    },
    async usernameAvailable(username: string, excludeId?: string): Promise<boolean> {
      const u = username.toLowerCase();
      const takenNow = Object.values(state.profiles).some((p) => p.username?.toLowerCase() === u && p.id !== excludeId);
      const reserved = (state.usernameHistory ?? {})[u] !== undefined && (state.usernameHistory ?? {})[u] !== excludeId;
      return delay(!takenNow && !reserved);
    },
    async changeUsername(newUsername: string): Promise<void> {
      const uid = state.currentUserId;
      if (!uid) throw new Error('You must be signed in.');
      const lower = newUsername.toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(lower)) {
        throw new Error('Username must be 3–20 characters: lowercase letters, numbers, or underscores.');
      }
      const me = state.profiles[uid];
      const old = me?.username;
      const isAdmin = me?.is_admin ?? false;
      if ((old ?? '').toLowerCase() === lower) return;
      if (Object.values(state.profiles).some((p) => p.username?.toLowerCase() === lower && p.id !== uid)) {
        throw new Error('That username is taken.');
      }
      const history = (state.usernameHistory ??= {});
      if (history[lower] && history[lower] !== uid && !isAdmin) throw new Error('That username is reserved.');
      if (old) history[old.toLowerCase()] = uid;
      state.profiles[uid] = { ...me, username: lower };
      touch();
      notify();
      return delay(undefined);
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
      if (!state.profiles[callerId]?.is_owner) throw new Error('Only the owner can change admin access.');
      const target = state.profiles[targetId];
      if (!target) throw new Error('Profile not found.');
      if (target.is_owner && !isAdmin) throw new Error('The owner cannot be removed as an admin.');
      const next = { ...target, is_admin: isAdmin };
      state.profiles[targetId] = next;
      touch();
      notify();
      return delay(next);
    },
    async deleteAccount(callerId: string, targetId: string): Promise<void> {
      assertAdmin(callerId);
      if (callerId === targetId) throw new Error('Use “Reset my account” to wipe your own account.');
      const target = state.profiles[targetId];
      if (!target) throw new Error('That account no longer exists.');
      if (target.is_owner) throw new Error('The owner account cannot be deleted.');
      if (target.is_admin && !state.profiles[callerId]?.is_owner) {
        throw new Error('Only the owner can delete an admin account.');
      }
      // Best-effort local wipe mirroring the server.
      for (const [id, job] of Object.entries(state.jobs)) if (job.poster_id === targetId) delete state.jobs[id];
      for (const [id, a] of Object.entries(state.applications)) if (a.quester_id === targetId) delete state.applications[id];
      for (const [id, c] of Object.entries(state.conversations)) {
        if (c.poster_id === targetId || c.quester_id === targetId) delete state.conversations[id];
      }
      state.jobPreferenceMessages[targetId] = [];
      delete state.jobPreferences[targetId];
      if (state.usernameHistory) {
        for (const [uname, uid] of Object.entries(state.usernameHistory)) {
          if (uid === targetId) delete state.usernameHistory[uname];
        }
      }
      delete state.profiles[targetId];
      touch();
      notify();
      return delay(undefined);
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
        jobs = jobs.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.description.toLowerCase().includes(q) ||
            j.category.replace(/-/g, ' ').includes(q),
        );
      }
      return delay(jobs.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    // Mock semantic search: no embedding model, so approximate with a keyword +
    // category match over open jobs. Real semantics arrive via the recs server
    // in production (supabaseDb.searchSemantic).
    async searchSemantic(query: string, opts?: { parish?: string; category?: string }): Promise<string[]> {
      const q = query.trim().toLowerCase();
      if (!q) return delay([]);
      let jobs = Object.values(state.jobs).filter((j) => j.status === 'open');
      if (opts?.parish) jobs = jobs.filter((j) => j.parish === opts.parish);
      if (opts?.category) jobs = jobs.filter((j) => j.category === opts.category);
      return delay(
        jobs
          .filter(
            (j) =>
              j.title.toLowerCase().includes(q) ||
              j.description.toLowerCase().includes(q) ||
              j.category.replace(/-/g, ' ').includes(q),
          )
          .map((j) => j.id),
      );
    },
    async get(id: string): Promise<Job | null> {
      return delay(state.jobs[id] ?? null);
    },
    async getByPublicId(publicId: string): Promise<Job | null> {
      return delay(Object.values(state.jobs).find((j) => j.public_id === publicId) ?? null);
    },
    async listByPoster(posterId: string): Promise<Job[]> {
      return delay(
        Object.values(state.jobs)
          .filter((j) => j.poster_id === posterId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    },
    async listAssignedTo(questerId: string): Promise<Job[]> {
      const acceptedJobIds = new Set(
        Object.values(state.applications)
          .filter((application) => application.quester_id === questerId && application.status === 'accepted')
          .map((application) => application.job_id),
      );
      return delay(Object.values(state.jobs).filter((job) => job.assigned_quester_id === questerId || acceptedJobIds.has(job.id)));
    },
    async create(input: Omit<Job, 'id' | 'public_id' | 'created_at' | 'status' | 'assigned_quester_id'>): Promise<Job> {
      const id = genId();
      const job: Job = { ...input, id, public_id: genPublicId(), status: 'open', assigned_quester_id: null, created_at: new Date().toISOString() };
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
    async remove(id: string): Promise<void> {
      delete state.jobs[id];
      for (const [aid, application] of Object.entries(state.applications)) {
        if (application.job_id === id) delete state.applications[aid];
      }
      for (const [cid, conversation] of Object.entries(state.conversations)) {
        if (conversation.job_id === id) delete state.conversations[cid];
      }
      touch();
      notify();
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
      const helperIds = new Set(
        Object.values(state.applications)
          .filter((application) => application.job_id === id && application.status === 'accepted')
          .map((application) => application.quester_id),
      );
      if (job.assigned_quester_id) helperIds.add(job.assigned_quester_id);
      for (const helperId of helperIds) {
        const helper = state.profiles[helperId];
        if (helper) state.profiles[helperId] = { ...helper, jobs_completed_count: helper.jobs_completed_count + 1 };
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
      if (job.status !== 'open') throw new Error('This job is no longer accepting applications.');
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
      emitNotification(job.poster_id, 'new_application', {
        title: 'New application',
        body: `${actorName(input.quester_id)} applied to “${job.title}”`,
        link: `/jobs/${job.id}`,
        jobId: job.id,
        actorId: input.quester_id,
      });
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

      state.applications[id] = { ...app, status: 'accepted' };
      // First hire keeps assigned_quester_id (single-helper UI/messaging).
      const firstHire = job.assigned_quester_id ?? app.quester_id;

      emitNotification(app.quester_id, 'application_accepted', {
        title: 'You’re hired',
        body: `You were accepted for “${job.title}”`,
        link: `/jobs/${job.id}`,
        jobId: job.id,
        actorId: job.poster_id,
      });

      const accepted = Object.values(state.applications).filter((a) => a.job_id === job.id && a.status === 'accepted').length;
      if (accepted >= job.slots) {
        // All spots filled → reject the rest and close the job.
        Object.values(state.applications)
          .filter((a) => a.job_id === job.id && a.status === 'pending')
          .forEach((a) => {
            state.applications[a.id] = { ...a, status: 'rejected' };
            emitNotification(a.quester_id, 'application_rejected', {
              title: 'Application update',
              body: `Your application for “${job.title}” wasn’t chosen this time`,
              link: `/jobs/${job.id}`,
              jobId: job.id,
              actorId: job.poster_id,
            });
          });
        state.jobs[job.id] = { ...job, status: 'assigned', assigned_quester_id: firstHire };
      } else {
        // Still recruiting — keep it open for more applicants.
        state.jobs[job.id] = { ...job, assigned_quester_id: firstHire };
      }
      touch();
      notify();
      return delay(state.applications[id]);
    },
    async reject(id: string): Promise<Application> {
      const app = state.applications[id];
      if (!app) throw new Error('Application not found.');
      const next = { ...app, status: 'rejected' as const };
      state.applications[id] = next;
      const job = state.jobs[app.job_id];
      emitNotification(app.quester_id, 'application_rejected', {
        title: 'Application update',
        body: job ? `Your application for “${job.title}” wasn’t chosen this time` : 'Your application wasn’t chosen this time',
        link: job ? `/jobs/${job.id}` : '/dashboard/applications',
        jobId: app.job_id,
        actorId: job?.poster_id ?? null,
      });
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
      if (conv) {
        state.conversations[conversationId] = { ...conv, last_message_at: message.created_at };
        const recipient = senderId === conv.poster_id ? conv.quester_id : conv.poster_id;
        emitNotification(recipient, 'new_message', {
          title: 'New message',
          body: `${actorName(senderId)}: ${body.slice(0, 120)}`,
          link: `/messages/${conv.id}`,
          jobId: conv.job_id,
          actorId: senderId,
        });
      }
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
      const dupe = Object.values(state.reviews).find(
        (r) => r.job_id === input.job_id && r.reviewer_id === input.reviewer_id && r.reviewee_id === input.reviewee_id,
      );
      if (dupe) throw new Error('You have already reviewed this person for this job.');
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
    async existsFor(jobId: string, reviewerId: string, revieweeId?: string): Promise<boolean> {
      return delay(
        Object.values(state.reviews).some(
          (r) => r.job_id === jobId && r.reviewer_id === reviewerId && (!revieweeId || r.reviewee_id === revieweeId),
        ),
      );
    },
  },

  notifications: {
    async listForUser(userId: string): Promise<Notification[]> {
      return delay(
        Object.values(state.notifications)
          .filter((n) => n.recipient_id === userId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    },
    async unreadCount(userId: string): Promise<number> {
      return delay(Object.values(state.notifications).filter((n) => n.recipient_id === userId && !n.read_at).length);
    },
    async markRead(id: string): Promise<void> {
      const n = state.notifications[id];
      if (n && !n.read_at) {
        state.notifications[id] = { ...n, read_at: new Date().toISOString() };
        touch();
        notify();
      }
      return delay(undefined);
    },
    async markAllRead(userId: string): Promise<void> {
      let changed = false;
      Object.values(state.notifications)
        .filter((n) => n.recipient_id === userId && !n.read_at)
        .forEach((n) => {
          state.notifications[n.id] = { ...n, read_at: new Date().toISOString() };
          changed = true;
        });
      if (changed) {
        touch();
        notify();
      }
      return delay(undefined);
    },
  },

  // Web push only fires against the real server; on mock these are inert stubs
  // so the subscribe UI can run without a backend.
  push: {
    async subscribe(_userId: string, _sub: PushSubscriptionInput): Promise<void> {
      return delay(undefined);
    },
    async unsubscribe(_endpoint: string): Promise<void> {
      return delay(undefined);
    },
  },

  moderation: {
    async createReport(input: { reporter_id: string; target_type: 'job' | 'user'; target_id: string; reason: string }): Promise<Report> {
      const targetUserId = input.target_type === 'job' ? state.jobs[input.target_id]?.poster_id ?? input.target_id : input.target_id;
      const id = genId();
      const report: Report = {
        id,
        reporter_id: input.reporter_id,
        target_type: input.target_type,
        target_id: input.target_id,
        target_user_id: targetUserId,
        reason: input.reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      state.reports[id] = report;
      touch();
      notify();
      // The agent runs in the background, streaming status to the admin feed.
      void runModerationAgent(report);
      return delay(report);
    },
    async listReports(callerId: string): Promise<Report[]> {
      assertAdmin(callerId);
      return delay(Object.values(state.reports).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async myReportForTarget(reporterId: string, targetType: 'job' | 'user', targetId: string): Promise<{ status: string } | null> {
      const found = Object.values(state.reports).find(
        (r) => r.reporter_id === reporterId && r.target_type === targetType && r.target_id === targetId,
      );
      return delay(found ? { status: found.status } : null);
    },
    async listEvents(callerId: string): Promise<ModerationEvent[]> {
      assertAdmin(callerId);
      return delay(
        Object.values(state.moderationEvents)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 60),
      );
    },
    async listActions(callerId: string): Promise<ModerationAction[]> {
      assertAdmin(callerId);
      return delay(
        Object.values(state.moderationActions)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 60),
      );
    },
    async adminBan(callerId: string, targetId: string, days: number, reason: string): Promise<void> {
      assertAdmin(callerId);
      applyBan(targetId, days, null, callerId, reason);
      touch();
      notify();
      return delay(undefined);
    },
    async adminSuspend(callerId: string, targetId: string, reason: string): Promise<void> {
      assertAdmin(callerId);
      applySuspend(targetId, null, callerId, reason);
      touch();
      notify();
      return delay(undefined);
    },
    async adminUnban(callerId: string, targetId: string): Promise<void> {
      assertAdmin(callerId);
      const p = state.profiles[targetId];
      if (p) state.profiles[targetId] = { ...p, banned_until: null, suspended: false, ban_reason: null };
      logModAction(null, callerId, 'unban', targetId, null, 'Lifted by admin.', null);
      touch();
      notify();
      return delay(undefined);
    },
  },

  // ---- recommendations -------------------------------------------------
  // Dev stand-in for the embeddings service: a category/parish heuristic so the
  // "Picked for you" UI is exercised on mock data. Production reads real rows.
  recommendations: {
    async listForUser(userId: string): Promise<JobRecommendation[]> {
      const me = state.profiles[userId];
      const allJobs = Object.values(state.jobs);
      const appliedJobIds = new Set(
        Object.values(state.applications)
          .filter((a) => a.quester_id === userId)
          .map((a) => a.job_id),
      );

      // Categories the user has touched before (posted / assigned / applied).
      const historyCats = new Map<string, number>();
      for (const j of allJobs) {
        const mine = j.poster_id === userId || j.assigned_quester_id === userId || appliedJobIds.has(j.id);
        if (mine) historyCats.set(j.category, (historyCats.get(j.category) ?? 0) + 1);
      }
      // Skills → category slug (e.g. "Pet care" → "pet-care").
      const skillCats = new Set((me?.skills ?? []).map((s) => s.toLowerCase().replace(/\s+/g, '-')));
      const keywordText = (me?.interest_keywords ?? []).map((keyword) => keyword.toLowerCase());
      const privatePreferences = state.jobPreferences[userId];
      const preferredCategories = new Set(privatePreferences?.preferred_categories ?? []);
      const preferenceText = `${privatePreferences?.summary ?? ''} ${(privatePreferences?.keywords ?? []).join(' ')}`.toLowerCase();
      const workedWithPosters = new Set(
        allJobs
          .filter((job) => job.status === 'completed' && job.assigned_quester_id === userId)
          .map((job) => job.poster_id),
      );

      const scored = allJobs
        .filter((j) => j.status === 'open' && j.poster_id !== userId && !appliedJobIds.has(j.id))
        .map((j) => {
          let score = 0.1; // base so eligible jobs always surface; overlaps rank higher
          let reason = 'Fresh on the island — might be up your street';
          if (me && j.parish === me.parish) {
            score += 1;
            reason = `Local to you in ${j.parish}`;
          }
          if (skillCats.has(j.category)) {
            score += 1;
            reason = `Matches your ${j.category.replace(/-/g, ' ')} skills`;
          }
          if (historyCats.has(j.category)) {
            score += 2;
            reason = `Close to jobs you've helped with in ${j.category.replace(/-/g, ' ')}`;
          }
          if (preferredCategories.has(j.category)) {
            score += 2;
            reason = 'One of the job topics you picked';
          }
          const searchable = `${j.title} ${j.description} ${j.category}`.toLowerCase();
          if (keywordText.some((keyword) => searchable.includes(keyword))) {
            score += 1.5;
            reason = 'Matches something in your interests';
          }
          if (preferenceText && searchable.split(/\s+/).some((word) => word.length > 4 && preferenceText.includes(word))) {
            score += 1.5;
            reason = 'Fits what you told the job assistant';
          }
          score += Math.min(Math.log1p(j.budget_amount ?? 0) / Math.log1p(500), 1) * 0.5;
          if (workedWithPosters.has(j.poster_id)) {
            score += 0.75;
            reason = "From someone you've successfully helped before";
          }
          return { job: j, score, reason };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 18);

      return delay(scored.map(({ job, score, reason }) => ({ job, score: Math.min(score / 5, 1), reason })));
    },
    async refresh(): Promise<{ ok: boolean }> {
      return delay({ ok: true });
    },
  },

  // ---- private job preferences ----------------------------------------
  preferences: {
    async get(): Promise<JobPreferenceState> {
      const userId = state.currentUserId;
      if (!userId) throw new Error('You must be signed in.');
      const saved = state.jobPreferences[userId];
      const isUserAdmin = state.profiles[userId]?.is_admin ?? false;
      return delay({
        preferred_categories: saved?.preferred_categories ?? [],
        summary: saved?.summary ?? '',
        keywords: saved?.keywords ?? [],
        updated_at: saved?.updated_at ?? null,
        messages: userId ? (state.jobPreferenceMessages[userId] ?? []) : [],
        remaining_today: isUserAdmin ? 999 : 20,
        daily_limit: isUserAdmin ? 999 : 20,
      });
    },
    async update(input: { preferredCategories: string[]; hideLocation: boolean }): Promise<JobPreferenceState> {
      const userId = state.currentUserId;
      if (!userId) throw new Error('You must be signed in.');
      const existing = state.jobPreferences[userId];
      state.jobPreferences[userId] = {
        preferred_categories: input.preferredCategories,
        summary: existing?.summary ?? '',
        keywords: existing?.keywords ?? [],
        updated_at: new Date().toISOString(),
      };
      state.profiles[userId] = { ...state.profiles[userId], hide_location: input.hideLocation };
      touch();
      notify();
      return db.preferences.get();
    },
    async sendMessage(message: string): Promise<JobPreferenceState> {
      const userId = state.currentUserId;
      if (!userId) throw new Error('You must be signed in.');
      const now = new Date().toISOString();
      const existing = state.jobPreferences[userId];
      const words = message.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? [];
      const keywords = [...new Set([...(existing?.keywords ?? []), ...words])].slice(-12);
      const summary = [existing?.summary, message.trim()].filter(Boolean).join(' ').slice(-1500);
      const assistant = 'Got it — I’ve added that to your job compass. You can tell me about timing, travel, pay, things you enjoy, or anything you want me to avoid.';
      const messages = [
        ...(state.jobPreferenceMessages[userId] ?? []),
        { id: genId(), role: 'user' as const, content: message.trim(), created_at: now },
        { id: genId(), role: 'assistant' as const, content: assistant, created_at: now },
      ];
      state.jobPreferenceMessages[userId] = messages;
      state.jobPreferences[userId] = {
        preferred_categories: existing?.preferred_categories ?? [],
        summary,
        keywords,
        updated_at: now,
      };
      touch();
      return delay({ ...(await db.preferences.get()), messages });
    },
    async clearChat(): Promise<JobPreferenceState> {
      const userId = state.currentUserId;
      if (!userId) throw new Error('You must be signed in.');
      state.jobPreferenceMessages[userId] = [];
      const existing = state.jobPreferences[userId];
      if (existing) state.jobPreferences[userId] = { ...existing, summary: '', keywords: [] };
      touch();
      notify();
      return delay(db.preferences.get());
    },
  },

  adminReset: {
    async resetOwnAccount(): Promise<void> {
      const userId = state.currentUserId;
      if (!userId) throw new Error('You must be signed in.');
      const profile = state.profiles[userId];
      if (!profile?.is_admin) {
        throw new Error('Account reset is only available for Admin accounts.');
      }
      // Local best-effort wipe so the dev/mock flow mirrors production.
      for (const [id, job] of Object.entries(state.jobs)) if (job.poster_id === userId) delete state.jobs[id];
      for (const [id, a] of Object.entries(state.applications)) if (a.quester_id === userId) delete state.applications[id];
      for (const [id, c] of Object.entries(state.conversations)) if (c.poster_id === userId || c.quester_id === userId) delete state.conversations[id];
      state.jobPreferenceMessages[userId] = [];
      delete state.jobPreferences[userId];

      // Free up username from history
      if (state.usernameHistory) {
        for (const [uname, uid] of Object.entries(state.usernameHistory)) {
          if (uid === userId) delete state.usernameHistory[uname];
        }
      }

      if (profile) {
        state.profiles[userId] = {
          ...profile,
          onboarded: false,
          username: null,
          full_name: '',
          bio: '',
          skills: [],
          interest_keywords: [],
          top_category: null,
        };
      }
      touch();
      notify();
      return delay(undefined);
    },
  },

  // ---- bots (admin demo data) — local generator so dev shows the feature -------
  bots: {
    async summon(count: number): Promise<{ profilesCreated: number; jobsCreated: number }> {
      const n = Math.max(1, Math.min(25, Math.floor(count)));
      const firsts = ['Ella', 'Sam', 'Georgie', 'Riya', 'Tom', 'Nina', 'Callum', 'Priya', 'Louis', 'Maya', 'Fred', 'Anya', 'Ollie', 'Bea'];
      const lasts = ['Renouf', 'Le Brun', 'De Gruchy', 'Falle', 'Vibert', 'Ahier', 'Le Sueur', 'Gallichan', 'Romeril', 'Bisson'];
      const pickOne = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
      let profilesCreated = 0;
      let jobsCreated = 0;

      for (let i = 0; i < n; i++) {
        const id = genId();
        const fullName = `${pickOne(firsts)} ${pickOne(lasts)}`;
        let username = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (Object.values(state.profiles).some((p) => p.username === username)) username = `${username}${Math.floor(Math.random() * 9000 + 1000)}`;
        const parish = pickOne(PARISHES);
        const skills = SKILL_OPTIONS.filter(() => Math.random() < 0.35).slice(0, 4);
        const bot: Profile = {
          id,
          email: `${username}@bots.sidequest.local`,
          username,
          full_name: fullName,
          avatar_url: null,
          bio: 'Friendly local, happy to lend a hand.',
          top_category: null,
          parish,
          phone: null,
          skills: [...skills],
          is_verified: false,
          is_admin: false,
          is_owner: false,
          is_bot: true,
          interest_keywords: [],
          hide_location: false,
          saved_pins: [],
          rating_avg: 0,
          rating_count: 0,
          jobs_posted_count: 0,
          jobs_completed_count: 0,
          onboarded: true,
          banned_until: null,
          suspended: false,
          ban_reason: null,
          created_at: new Date().toISOString(),
        };
        state.profiles[id] = bot;
        profilesCreated++;

        const jobCount = 1 + Math.floor(Math.random() * 2);
        for (let j = 0; j < jobCount; j++) {
          const cat = pickOne(JOB_CATEGORIES);
          const jid = genId();
          state.jobs[jid] = {
            id: jid,
            public_id: genPublicId(),
            poster_id: id,
            title: `${cat.label} help needed in ${parish}`,
            description: `Looking for a hand with some ${cat.label.toLowerCase()} around ${parish}.`,
            category: cat.slug,
            parish,
            location_detail: null,
            budget_type: 'fixed',
            budget_amount: 10 + Math.floor(Math.random() * 9) * 5,
            estimated_hours: 1 + Math.floor(Math.random() * 3),
            date_needed: null,
            slots: 1,
            is_flexible_date: true,
            is_recurring: false,
            recurrence: null,
            location_lat: null,
            location_lng: null,
            status: 'open',
            assigned_quester_id: null,
            photos: [],
            created_at: new Date().toISOString(),
          };
          jobsCreated++;
        }
      }
      touch();
      notify();
      return delay({ profilesCreated, jobsCreated });
    },
    async remove(): Promise<{ removed: number }> {
      const botIds = Object.values(state.profiles)
        .filter((p) => p.is_bot)
        .map((p) => p.id);
      for (const id of botIds) {
        Object.values(state.jobs)
          .filter((j) => j.poster_id === id)
          .forEach((j) => delete state.jobs[j.id]);
        delete state.profiles[id];
      }
      touch();
      notify();
      return delay({ removed: botIds.length });
    },
  },
};

export function currentUserId(): string | null {
  return state.currentUserId;
}

export function setMockUserId(id: string | null): void {
  state.currentUserId = id;
}

export type Repo = typeof db;
