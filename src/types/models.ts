import type { ApplicationStatus, BudgetType, JobStatus, Parish } from '../lib/constants';

export interface SavedPin {
  lat: number;
  lng: number;
  label?: string;
}

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  /** AI-derived strongest category (nearest to the user's taste vector). Set by the recs server. */
  top_category: string | null;
  /** Null only when viewing somebody who has chosen to keep their parish private. */
  parish: Parish | null;
  phone: string | null;
  skills: string[];
  is_verified: boolean;
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
  /** Free-text interests that nudge the recommender, beyond the fixed skill tags. */
  interest_keywords: string[];
  /** When true, the parish is hidden from others but still used by the recommender. */
  hide_location: boolean;
  saved_pins: SavedPin[];
  rating_avg: number;
  rating_count: number;
  jobs_posted_count: number;
  jobs_completed_count: number;
  onboarded: boolean;
  /** Timed ban — the user can't act until this time passes. Null when not banned. */
  banned_until: string | null;
  /** Indefinite suspension until an admin lifts it. */
  suspended: boolean;
  /** Human-readable reason shown to the user on the blocked screen. */
  ban_reason: string | null;
  created_at: string;
}

export type ReportTargetType = 'job' | 'user';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  /** For a job report, the job's owner — so the agent can pull their history. */
  target_user_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

export type ModerationDecision = 'dismiss' | 'remove_post' | 'ban_user' | 'suspend_user' | 'unban';

export interface ModerationAction {
  id: string;
  report_id: string | null;
  /** 'gemini' for the agent, or an admin's user id for a manual action. */
  decided_by: string;
  action: ModerationDecision;
  target_user_id: string;
  job_id: string | null;
  reason: string;
  /** For ban_user: when the ban lifts. */
  ban_until: string | null;
  created_at: string;
}

/** A single step the moderation agent streams to the admin live feed. */
export interface ModerationEvent {
  id: string;
  report_id: string;
  kind: 'received' | 'context' | 'analyzing' | 'decision' | 'applied' | 'done' | 'error';
  message: string;
  created_at: string;
}

export interface Job {
  id: string;
  /** Short, non-guessable, roughly time-sortable public id used in shareable URLs (/job/:username/:public_id). */
  public_id: string;
  poster_id: string;
  title: string;
  description: string;
  category: string;
  parish: Parish;
  location_detail: string | null;
  budget_type: BudgetType;
  budget_amount: number | null;
  estimated_hours: number | null;
  date_needed: string | null;
  slots: number;
  is_flexible_date: boolean;
  is_recurring: boolean;
  recurrence: string | null;
  location_lat: number | null;
  location_lng: number | null;
  status: JobStatus;
  assigned_quester_id: string | null;
  photos: string[];
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  quester_id: string;
  message: string;
  proposed_amount: number | null;
  status: ApplicationStatus;
  created_at: string;
}

export interface Conversation {
  id: string;
  job_id: string;
  poster_id: string;
  quester_id: string;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export type NotificationType = 'new_application' | 'new_message' | 'application_accepted' | 'application_rejected';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** In-app deep link (e.g. /jobs/:id or /messages/:conversationId). */
  link: string;
  job_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

/** A recommended open job plus the "why" line — produced by the recommendations service
 *  in production, or a local heuristic in dev (mock backend). */
export interface JobRecommendation {
  job: Job;
  reason: string;
  score: number;
}

export interface JobPreferenceMessage {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface JobPreferenceState {
  preferred_categories: string[];
  summary: string;
  keywords: string[];
  updated_at: string | null;
  messages: JobPreferenceMessage[];
  remaining_today: number;
  daily_limit: number;
}
