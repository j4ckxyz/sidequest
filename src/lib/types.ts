// Types mirror the Supabase schema (snake_case columns) so queries need no mapping.

export type Field =
  | 'Digital & Tech'
  | 'Finance'
  | 'Law'
  | 'Creative'
  | 'Environment'

export type Role = 'student' | 'employer'

export type ProjectKind =
  | 'Dissertation'
  | 'Codebase'
  | 'Case Study'
  | 'Design'
  | 'Research'

export type OpportunityType = '1-day Shadow' | '2-week Project' | 'Reading Week'

export interface Profile {
  id: string
  role: Role
  created_at: string
}

export interface Project {
  id: string
  student_id: string
  title: string
  kind: ProjectKind
  summary: string
  link: string | null
  link_label: string | null
  tags: string[]
  created_at: string
}

export interface Student {
  id: string
  name: string
  headline: string
  bio: string
  degree: string
  field: Field | null
  university: string
  uk_city: string
  graduation_year: number | null
  seeking: string
  availability: string
  gpa: string
  skills: string[]
  discoverable: boolean
  created_at: string
  updated_at: string
  projects?: Project[]
}

export interface Employer {
  id: string
  company: string
  contact_name: string
  field: Field | null
  about: string
  created_at: string
}

export interface Opportunity {
  id: string
  employer_id: string
  company: string
  role: string
  type: OpportunityType
  field: Field | null
  location: string
  window: string
  paid: string
  spots: number
  summary: string
  created_at: string
}

export interface Bursary {
  id: string
  employer_id: string
  provider: string
  title: string
  amount: string
  field: Field | 'Open to all' | null
  degrees: string[]
  deadline: string
  commitment: string
  summary: string
  perks: string[]
  created_at: string
}

export interface InterviewRequest {
  id: string
  employer_id: string
  student_id: string
  message: string
  status: string
  created_at: string
}

export interface Application {
  id: string
  student_id: string
  opportunity_id: string | null
  bursary_id: string | null
  created_at: string
}
