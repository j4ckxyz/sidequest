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
  parish: Parish;
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
  created_at: string;
}

export interface Job {
  id: string;
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
