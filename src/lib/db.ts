import { supabase } from './supabase'
import type {
  Application,
  Bursary,
  Employer,
  InterviewRequest,
  Opportunity,
  Profile,
  Project,
  Student,
} from './types'

// ── Profile / role ───────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Student ──────────────────────────────────────────────────────────────────

export async function getMyStudent(userId: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*, projects(*)')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Student | null
}

export async function updateStudent(
  userId: string,
  patch: Partial<Student>,
): Promise<void> {
  const { projects: _p, id: _i, ...rest } = patch as Student
  const { error } = await supabase.from('students').update(rest).eq('id', userId)
  if (error) throw error
}

export async function searchStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*, projects(*)')
    .eq('discoverable', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Student[]
}

// ── Projects ─────────────────────────────────────────────────────────────────

export async function addProject(
  p: Omit<Project, 'id' | 'created_at'>,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(p)
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

// ── Employer ─────────────────────────────────────────────────────────────────

export async function getMyEmployer(userId: string): Promise<Employer | null> {
  const { data, error } = await supabase
    .from('employers')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Employer | null
}

export async function updateEmployer(
  userId: string,
  patch: Partial<Employer>,
): Promise<void> {
  const { id: _i, ...rest } = patch as Employer
  const { error } = await supabase.from('employers').update(rest).eq('id', userId)
  if (error) throw error
}

export async function employersByIds(ids: string[]): Promise<Employer[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('employers')
    .select('*')
    .in('id', ids)
  if (error) throw error
  return (data ?? []) as Employer[]
}

// ── Opportunities ────────────────────────────────────────────────────────────

export async function listOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Opportunity[]
}

export async function myOpportunities(userId: string): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('employer_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Opportunity[]
}

export async function createOpportunity(
  o: Omit<Opportunity, 'id' | 'created_at'>,
): Promise<Opportunity> {
  const { data, error } = await supabase
    .from('opportunities')
    .insert(o)
    .select()
    .single()
  if (error) throw error
  return data as Opportunity
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await supabase.from('opportunities').delete().eq('id', id)
  if (error) throw error
}

// ── Bursaries ────────────────────────────────────────────────────────────────

export async function listBursaries(): Promise<Bursary[]> {
  const { data, error } = await supabase
    .from('bursaries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Bursary[]
}

export async function myBursaries(userId: string): Promise<Bursary[]> {
  const { data, error } = await supabase
    .from('bursaries')
    .select('*')
    .eq('employer_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Bursary[]
}

export async function createBursary(
  b: Omit<Bursary, 'id' | 'created_at'>,
): Promise<Bursary> {
  const { data, error } = await supabase.from('bursaries').insert(b).select().single()
  if (error) throw error
  return data as Bursary
}

export async function deleteBursary(id: string): Promise<void> {
  const { error } = await supabase.from('bursaries').delete().eq('id', id)
  if (error) throw error
}

// ── Interview requests ───────────────────────────────────────────────────────

export async function requestInterview(
  employerId: string,
  studentId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase
    .from('interview_requests')
    .upsert(
      { employer_id: employerId, student_id: studentId, message },
      { onConflict: 'employer_id,student_id' },
    )
  if (error) throw error
}

export async function myInterviewRequests(
  employerId: string,
): Promise<InterviewRequest[]> {
  const { data, error } = await supabase
    .from('interview_requests')
    .select('*')
    .eq('employer_id', employerId)
  if (error) throw error
  return (data ?? []) as InterviewRequest[]
}

export async function incomingInterviewRequests(
  studentId: string,
): Promise<InterviewRequest[]> {
  const { data, error } = await supabase
    .from('interview_requests')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as InterviewRequest[]
}

// ── Applications ─────────────────────────────────────────────────────────────

export async function apply(
  studentId: string,
  target: { opportunity_id?: string; bursary_id?: string },
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .insert({ student_id: studentId, ...target })
  if (error) throw error
}

export async function myApplications(studentId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('student_id', studentId)
  if (error) throw error
  return (data ?? []) as Application[]
}
