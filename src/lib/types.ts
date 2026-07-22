// Types mirror the Supabase schema (snake_case) so queries need no mapping.

export type QuestType = 'single' | 'weekly'
export type QuestStatus = 'open' | 'completed' | 'cancelled'
export type ApplicationStatus = 'applied' | 'accepted' | 'rejected'

// One unified account. Everyone can post quests and complete them.
export interface Profile {
  id: string
  name: string
  parish: string
  bio: string
  skills: string[]
  xp: number
  quests_done: number
  created_at: string
  updated_at: string
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
  party_size: number
  applicant_count: number
  accepted_count: number
  status: QuestStatus
  created_at: string
  // joined
  poster?: Pick<Profile, 'name'> | null
}

export interface Application {
  id: string
  quest_id: string
  doer_id: string
  message: string
  status: ApplicationStatus
  created_at: string
  // joined
  doer?: Profile | null
  quest?: Quest | null
}

export interface Message {
  id: string
  quest_id: string
  doer_id: string
  sender_id: string
  sender_name: string
  body: string
  created_at: string
}

export interface WeekLog {
  id: string
  quest_id: string
  doer_id: string
  week_start: string // YYYY-MM-DD
  created_at: string
}
