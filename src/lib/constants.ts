import type { LucideIcon } from 'lucide-react'
import {
  Sprout,
  PawPrint,
  Laptop,
  BookOpen,
  Sparkles,
  Package,
  CalendarDays,
  ShoppingBag,
  Wrench,
  Compass,
  Anchor,
  Shield,
  Crown,
} from 'lucide-react'

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

export const categoryIcon: Record<string, LucideIcon> = {
  Gardening: Sprout,
  Pets: PawPrint,
  'Tech Help': Laptop,
  Tutoring: BookOpen,
  Cleaning: Sparkles,
  'Moving & Lifting': Package,
  Events: CalendarDays,
  Errands: ShoppingBag,
  Other: Wrench,
}

export function iconForCategory(category: string): LucideIcon {
  return categoryIcon[category] ?? Wrench
}

// ── XP & ranks ────────────────────────────────────────────────────────────────
export interface Rank {
  name: string
  min: number
  icon: LucideIcon
}

export const ranks: Rank[] = [
  { name: 'Novice Adventurer', min: 0, icon: Sprout },
  { name: 'Apprentice Helper', min: 150, icon: Compass },
  { name: 'Island Explorer', min: 400, icon: Anchor },
  { name: 'Parish Hero', min: 800, icon: Shield },
  { name: 'Local Legend', min: 1500, icon: Crown },
]

export function rankFor(xp: number): { current: Rank; next: Rank | null; progress: number } {
  let current = ranks[0]
  for (const r of ranks) if (xp >= r.min) current = r
  const idx = ranks.indexOf(current)
  const next = idx < ranks.length - 1 ? ranks[idx + 1] : null
  const progress = next ? Math.min(1, (xp - current.min) / (next.min - current.min)) : 1
  return { current, next, progress }
}

// XP a quest is worth, derived from its £ reward (min 30).
export function xpForReward(reward: number): number {
  return Math.max(30, Math.round(reward) * 10)
}

// ── Avatars ──────────────────────────────────────────────────────────────────
// Muted, earthy two-stop gradients — warm and calm, never neon.
const gradients = [
  'from-clay-400 to-clay-600',
  'from-[#a8927a] to-[#7c6a55]', // taupe
  'from-[#93a08a] to-[#6c7860]', // sage
  'from-[#c19a86] to-[#96685a]', // sienna
  'from-[#c7ab74] to-[#9c7f4c]', // sand
  'from-[#9a938a] to-[#6e675f]', // stone
  'from-[#bd8f88] to-[#8f5f5b]', // dusty rose
  'from-[#8c9aa0] to-[#5f6d73]', // slate
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
