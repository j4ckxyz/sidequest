import type { ApplicationStatus, BudgetType, JobStatus, Parish } from '../lib/constants';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  parish: Parish;
  phone: string | null;
  skills: string[];
  is_verified: boolean;
  is_admin: boolean;
  rating_avg: number;
  rating_count: number;
  jobs_posted_count: number;
  jobs_completed_count: number;
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
  date_needed: string;
  is_flexible_date: boolean;
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
