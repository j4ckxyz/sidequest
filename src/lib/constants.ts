// Jersey's 12 parishes — the "Guilds" of the Quest Board.
export const parishes = [
  'St Helier',
  'St Saviour',
  'St Clement',
  'Grouville',
  'St Martin',
  'Trinity',
  'St John',
  'St Mary',
  'St Ouen',
  'St Peter',
  'St Brelade',
  'St Lawrence',
] as const

export const questCategories = [
  'Gardening',
  'Pets',
  'Tech Help',
  'Tutoring',
  'Cleaning',
  'Moving & Lifting',
  'Events',
  'Errands',
  'Other',
] as const

export const skillSuggestions = [
  'Gardening',
  'Dog walking',
  'Tech support',
  'Tutoring',
  'Cleaning',
  'Lifting & moving',
  'Babysitting',
  'Car washing',
  'Painting',
  'Event setup',
  'Cooking',
  'Photography',
]

export const categoryEmoji: Record<string, string> = {
  Gardening: '🌱',
  Pets: '🐾',
  'Tech Help': '💻',
  Tutoring: '📚',
  Cleaning: '🧽',
  'Moving & Lifting': '📦',
  Events: '🎉',
  Errands: '🛍️',
  Other: '⭐',
}

// ── XP & ranks ────────────────────────────────────────────────────────────────
export interface Rank {
  name: string
  min: number
  emoji: string
}

export const ranks: Rank[] = [
  { name: 'Novice Adventurer', min: 0, emoji: '🌱' },
  { name: 'Apprentice Helper', min: 150, emoji: '🧭' },
  { name: 'Island Explorer', min: 400, emoji: '⚓' },
  { name: 'Parish Hero', min: 800, emoji: '🛡️' },
  { name: 'Local Legend', min: 1500, emoji: '👑' },
]

export function rankFor(xp: number): { current: Rank; next: Rank | null; progress: number } {
  let current = ranks[0]
  for (const r of ranks) if (xp >= r.min) current = r
  const idx = ranks.indexOf(current)
  const next = idx < ranks.length - 1 ? ranks[idx + 1] : null
  const progress = next
    ? Math.min(1, (xp - current.min) / (next.min - current.min))
    : 1
  return { current, next, progress }
}

// XP a quest is worth, derived from its £ reward (min 30).
export function xpForReward(reward: number): number {
  return Math.max(30, Math.round(reward) * 10)
}

// ── Avatars ──────────────────────────────────────────────────────────────────
const gradients = [
  'from-jersey-400 to-jersey-700',
  'from-rose-400 to-jersey-700',
  'from-amber-400 to-orange-600',
  'from-orange-400 to-jersey-600',
  'from-pink-400 to-rose-600',
  'from-red-400 to-rose-700',
  'from-fuchsia-400 to-jersey-700',
  'from-amber-500 to-jersey-600',
]

export function gradientFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return gradients[h % gradients.length]
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
