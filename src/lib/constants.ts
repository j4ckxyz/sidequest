import type { Field, ProjectKind, OpportunityType } from './types'

export const fields: Field[] = [
  'Digital & Tech',
  'Finance',
  'Law',
  'Creative',
  'Environment',
]

export const projectKinds: ProjectKind[] = [
  'Dissertation',
  'Codebase',
  'Case Study',
  'Design',
  'Research',
]

export const opportunityTypes: OpportunityType[] = [
  '1-day Shadow',
  '2-week Project',
  'Reading Week',
]

// A palette of tasteful gradients, assigned deterministically per entity so
// avatars/logos are colourful but stable across reloads.
const gradients = [
  'from-sea-400 to-sea-700',
  'from-indigo-400 to-indigo-700',
  'from-rose-400 to-fuchsia-700',
  'from-amber-400 to-orange-700',
  'from-emerald-400 to-teal-700',
  'from-violet-400 to-violet-700',
  'from-cyan-400 to-sky-700',
  'from-pink-400 to-rose-700',
  'from-slate-400 to-slate-700',
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
