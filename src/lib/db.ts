import { supabase } from './supabase'
import type {
  Application,
  ApplicationStatus,
  Doer,
  Message,
  Poster,
  Profile,
  Quest,
} from './types'

const QUEST_WITH_POSTER = '*, poster:posters(name, community_verified, kind)'

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

// ── Doer ─────────────────────────────────────────────────────────────────────

export async function getMyDoer(userId: string): Promise<Doer | null> {
  const { data, error } = await supabase
    .from('doers')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Doer | null
}

export async function updateDoer(userId: string, patch: Partial<Doer>): Promise<void> {
  const { id: _i, xp: _x, quests_done: _q, created_at: _c, updated_at: _u, ...rest } =
    patch as Doer
  const { error } = await supabase.from('doers').update(rest).eq('id', userId)
  if (error) throw error
}

// ── Poster ───────────────────────────────────────────────────────────────────

export async function getMyPoster(userId: string): Promise<Poster | null> {
  const { data, error } = await supabase
    .from('posters')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Poster | null
}

export async function updatePoster(userId: string, patch: Partial<Poster>): Promise<void> {
  const { id: _i, created_at: _c, ...rest } = patch as Poster
  const { error } = await supabase.from('posters').update(rest).eq('id', userId)
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
  const { data, error } = await supabase.from('quests').insert(q).select(QUEST_WITH_POSTER).single()
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
    .select('*, doer:doers(*)')
    .eq('quest_id', questId)
    .order('created_at', { ascending: true })
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

// ── Messages (Safe-Chat) ─────────────────────────────────────────────────────

export async function listMessages(questId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('quest_id', questId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Message[]
}

export async function sendMessage(
  questId: string,
  senderId: string,
  senderName: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({ quest_id: questId, sender_id: senderId, sender_name: senderName, body })
  if (error) throw error
}
