import { supabase } from './supabase'
import type {
  Application,
  ApplicationStatus,
  Message,
  Profile,
  Quest,
  WeekLog,
} from './types'

const QUEST_WITH_POSTER = '*, poster:profiles(name)'

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<void> {
  const { id: _i, xp: _x, quests_done: _q, created_at: _c, updated_at: _u, ...rest } =
    patch as Profile
  const { error } = await supabase.from('profiles').update(rest).eq('id', userId)
  if (error) throw error
}

// ── Quests ───────────────────────────────────────────────────────────────────

export async function listQuests(): Promise<Quest[]> {
  const { data, error } = await supabase
    .from('quests')
    .select(QUEST_WITH_POSTER)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Quest[]
}

export async function myQuests(posterId: string): Promise<Quest[]> {
  const { data, error } = await supabase
    .from('quests')
    .select(QUEST_WITH_POSTER)
    .eq('poster_id', posterId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Quest[]
}

export async function createQuest(
  q: Omit<
    Quest,
    'id' | 'created_at' | 'applicant_count' | 'accepted_count' | 'status' | 'poster'
  >,
): Promise<Quest> {
  const { data, error } = await supabase
    .from('quests')
    .insert(q)
    .select(QUEST_WITH_POSTER)
    .single()
  if (error) throw error
  return data as Quest
}

export async function deleteQuest(id: string): Promise<void> {
  const { error } = await supabase.from('quests').delete().eq('id', id)
  if (error) throw error
}

export async function completeQuest(id: string): Promise<void> {
  const { error } = await supabase.rpc('complete_quest', { p_quest: id })
  if (error) throw error
}

// Archive a (weekly) quest to history without awarding bulk XP.
export async function archiveQuest(id: string): Promise<void> {
  const { error } = await supabase.from('quests').update({ status: 'completed' }).eq('id', id)
  if (error) throw error
}

// ── Applications ─────────────────────────────────────────────────────────────

export async function applyToQuest(
  questId: string,
  doerId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .upsert(
      { quest_id: questId, doer_id: doerId, message },
      { onConflict: 'quest_id,doer_id' },
    )
  if (error) throw error
}

export async function myApplications(doerId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`*, quest:quests(${QUEST_WITH_POSTER})`)
    .eq('doer_id', doerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Application[]
}

export async function questApplications(questId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, doer:profiles(*)')
    .eq('quest_id', questId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Application[]
}

// All applications to a set of quests (used to build the poster's chat threads).
export async function applicationsForQuests(questIds: string[]): Promise<Application[]> {
  if (questIds.length === 0) return []
  const { data, error } = await supabase
    .from('applications')
    .select('*, doer:profiles(*)')
    .in('quest_id', questIds)
  if (error) throw error
  return (data ?? []) as Application[]
}

export async function setApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase.from('applications').update({ status }).eq('id', id)
  if (error) throw error
}

// ── Messages (Safe-Chat) — one private thread per (quest, doer) ───────────────

// Every message in a thread the current user belongs to (RLS-scoped),
// newest first — used to compute conversation previews.
export async function myMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Message[]
}

export async function listMessages(questId: string, doerId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('quest_id', questId)
    .eq('doer_id', doerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Message[]
}

export async function sendMessage(
  questId: string,
  doerId: string,
  senderId: string,
  senderName: string,
  body: string,
): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    quest_id: questId,
    doer_id: doerId,
    sender_id: senderId,
    sender_name: senderName,
    body,
  })
  if (error) throw error
}

// ── Weekly logs ──────────────────────────────────────────────────────────────

export async function questWeekLogs(questId: string): Promise<WeekLog[]> {
  const { data, error } = await supabase.from('week_logs').select('*').eq('quest_id', questId)
  if (error) throw error
  return (data ?? []) as WeekLog[]
}

export async function logWeek(questId: string, doerId: string, weekStart: string): Promise<void> {
  const { error } = await supabase.rpc('log_week', {
    p_quest: questId,
    p_doer: doerId,
    p_week: weekStart,
  })
  if (error) throw error
}

export async function unlogWeek(questId: string, doerId: string, weekStart: string): Promise<void> {
  const { error } = await supabase.rpc('unlog_week', {
    p_quest: questId,
    p_doer: doerId,
    p_week: weekStart,
  })
  if (error) throw error
}
