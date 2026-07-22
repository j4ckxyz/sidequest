// Types mirror the Supabase schema (snake_case) so queries need no mapping.

export type Role = 'doer' | 'poster'
export type QuestType = 'single' | 'weekly'
export type QuestStatus = 'open' | 'completed' | 'cancelled'
export type ApplicationStatus = 'applied' | 'accepted' | 'rejected'
export type PosterKind = 'resident' | 'business'

export interface Profile {
  id: string
  role: Role
  created_at: string
}

export interface Doer {
  id: string
  name: string
  bio: string
  parish: string
  skills: string[]
  xp: number
  quests_done: number
  created_at: string
  updated_at: string
}

export interface Poster {
  id: string
  name: string
  kind: PosterKind
  parish: string
  about: string
  community_verified: boolean
  created_at: string
}

export interface Quest {
  id: string
  poster_id: string
  title: string
  description: string
  category: string
  type: QuestType
  parish: string
  reward: number
  xp_reward: number
  schedule: string
  bus_friendly: boolean
  party_size: number
  applicant_count: number
  accepted_count: number
  status: QuestStatus
  created_at: string
  // joined
  poster?: Pick<Poster, 'name' | 'community_verified' | 'kind'> | null
}

export interface Application {
  id: string
  quest_id: string
  doer_id: string
  message: string
  status: ApplicationStatus
  created_at: string
  // joined
  doer?: Doer | null
  quest?: Quest | null
}

export interface Message {
  id: string
  quest_id: string
  sender_id: string
  sender_name: string
  body: string
  created_at: string
}
