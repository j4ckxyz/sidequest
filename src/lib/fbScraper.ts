// ─────────────────────────────────────────────────────────────────────────────
// Jersey Ask Advice — Facebook scraper "brain"
//
// Reads posts from the "Jersey Ask Advice" Facebook group, works out which ones
// are people *looking for help*, and turns each into a ready-to-post SideQuest
// quest with every field filled in (title, category, parish, single/weekly,
// reward estimate, schedule) plus attribution back to the original poster.
//
// This module is pure (no DOM / React / network) so it can be shared by the
// in-app importer page AND the headless `scripts/fb-scraper.mjs` CLI, and unit
// reasoned about on its own.
// ─────────────────────────────────────────────────────────────────────────────

import { parishes, questCategories } from './constants'
import type { QuestType } from './types'
import sampleFeed from './sampleFeed.json'

// A raw post as it comes off the group feed (from a live scrape or pasted text).
export interface RawPost {
  id: string
  author: string
  text: string
  postedAt: string // ISO date string; '' if unknown
  permalink: string
  reactions?: number
  comments?: number
}

export type Confidence = 'high' | 'medium' | 'low'

// A post that has been analysed and mapped onto SideQuest's quest shape.
export interface ScrapedQuest {
  source: RawPost
  isHelpRequest: boolean
  confidence: Confidence
  reasons: string[] // human-readable signals that fired (or why it was skipped)
  // Proposed quest fields — every one is pre-filled and editable in the UI.
  title: string
  description: string
  category: string
  type: QuestType
  parish: string
  reward: number
  schedule: string
}

// ── Help-request detection ───────────────────────────────────────────────────
// People "asking for advice/help" phrase it in fairly consistent ways. We look
// for those asks and, crucially, screen OUT the group's other traffic (things
// for sale, thank-you posts, general chit-chat) so we don't create junk quests.

const HELP_SIGNALS: { re: RegExp; label: string }[] = [
  { re: /\bcan (?:anyone|someone|somebody)\b/i, label: 'asks “can anyone…”' },
  { re: /\b(?:anyone|someone|somebody) (?:able to|who can|that can|around|available)\b/i, label: 'asks if anyone is available' },
  { re: /\bdoes anyone (?:know|do|offer)\b/i, label: 'asks “does anyone know…”' },
  { re: /\b(?:can|could) (?:anyone|someone|you) recommend\b/i, label: 'asks for a recommendation' },
  { re: /\b(?:recommend|recommendation|recommendations|suggestions) (?:for|of|please|anyone)\b/i, label: 'asks for recommendations' },
  { re: /\blooking (?:for|to find)\b/i, label: 'says “looking for…”' },
  { re: /\b(?:after|need|needing|want|wanted|requiring|require|in need of)\s+(?:a|an|some|someone|help)\b/i, label: 'needs someone/something' },
  { re: /\bneed (?:a )?(?:hand|help)\b/i, label: 'needs a hand' },
  { re: /\bhelp (?:with|please|needed|wanted)\b/i, label: 'asks for help' },
  { re: /\bwho (?:can|could|does|do i)\b/i, label: 'asks “who can…”' },
  { re: /\bany (?:recommendations|one able|good|reliable)\b/i, label: 'asks for anyone good/reliable' },
  { re: /\bhappy to pay\b/i, label: 'offers to pay' },
  { re: /\bwilling to pay\b/i, label: 'offers to pay' },
  { re: /\bwill pay (?:cash|well)?\b/i, label: 'offers to pay' },
  { re: /\bpaid (?:work|job|cash)\b/i, label: 'offers paid work' },
  { re: /\bwanted\b/i, label: 'says “wanted”' },
]

// Posts that look like asks but are NOT jobs SideQuest can help with.
const NEGATIVE_SIGNALS: { re: RegExp; label: string }[] = [
  { re: /\bfor sale\b/i, label: 'a for-sale post' },
  { re: /\b(?:selling|i'?m selling|swap|swaps|free to (?:a )?good home)\b/i, label: 'selling / giving away an item' },
  { re: /\b(?:thank you|thanks (?:to |so much|everyone)|massive thank)\b/i, label: 'a thank-you post' },
  { re: /\bdoes anyone else (?:think|feel|find|get)\b/i, label: 'an opinion / discussion post' },
  { re: /\b(?:just a )?(?:psa|heads up|reminder|fyi)\b/i, label: 'a notice / PSA' },
  { re: /\b(?:lost|found) (?:dog|cat|keys|wallet|phone|purse)\b/i, label: 'a lost-and-found post' },
  { re: /\bfree (?:to collect|collection|stuff)\b/i, label: 'a freebie post' },
]

interface HelpAnalysis {
  isRequest: boolean
  confidence: Confidence
  reasons: string[]
}

export function detectHelpRequest(text: string): HelpAnalysis {
  const positives = HELP_SIGNALS.filter((s) => s.re.test(text))
  const negatives = NEGATIVE_SIGNALS.filter((s) => s.re.test(text))

  // A strong negative (for sale, thank-you, opinion) vetoes a weak ask.
  if (negatives.length && positives.length < 2) {
    return {
      isRequest: false,
      confidence: 'low',
      reasons: negatives.map((n) => `Looks like ${n.label}`),
    }
  }

  if (positives.length === 0) {
    return {
      isRequest: false,
      confidence: 'low',
      reasons: ['No “looking for help” language found'],
    }
  }

  const reasons = positives.map((p) => p.label)
  // Confidence scales with how many independent asks fire, nudged up when the
  // poster mentions paying (a strong signal it's a real job).
  const paying = /\b(?:pay|cash|paid|£\s?\d)/i.test(text)
  let confidence: Confidence = 'low'
  if (positives.length >= 3 || (positives.length >= 2 && paying)) confidence = 'high'
  else if (positives.length >= 2 || paying) confidence = 'medium'

  return { isRequest: true, confidence, reasons }
}

// ── Parish detection ─────────────────────────────────────────────────────────
// Jersey people say their area, not always their parish. Map the common town /
// area / landmark names back onto the 12 parish "Guilds".

const PARISH_HINTS: Record<(typeof parishes)[number], RegExp> = {
  'St Helier': /\b(?:st\.? ?helier|town centre|in town|havre des pas|first tower|georgetown|springfield|west park|people'?s park)\b/i,
  'St Saviour': /\b(?:st\.? ?saviour|five oaks|longueville|maufant|princes tower)\b/i,
  'St Clement': /\b(?:st\.? ?clement|le hocq|samares|pontac|green ?island)\b/i,
  Grouville: /\b(?:grouville|la rocque|gorey village|fauvic)\b/i,
  'St Martin': /\b(?:st\.? ?martin|rozel|st\.? ?catherine|gorey(?! village))\b/i,
  Trinity: /\b(?:trinity|bouley bay|les augrès)\b/i,
  'St John': /\b(?:st\.? ?john|sorel|bonne nuit)\b/i,
  'St Mary': /\b(?:st\.? ?mary|st\.? ?mary'?s)\b/i,
  'St Ouen': /\b(?:st\.? ?ouen|l'?etacq|les landes|greve de lecq|five mile road)\b/i,
  'St Peter': /\b(?:st\.? ?peter|beaumont|the airport|jersey airport|quennevais(?! park)?)\b/i,
  'St Brelade': /\b(?:st\.? ?brelade|st\.? ?aubin|les quennevais|red houses|ouaisné|ouaisne|la moye|portelet)\b/i,
  'St Lawrence': /\b(?:st\.? ?lawrence|goose green|coin varin|millbrook)\b/i,
}

export function detectParish(text: string): string {
  // Pick the parish whose area is mentioned *first* — for "move from St Aubin to
  // Gorey", the pickup (St Aubin → St Brelade) is the useful location.
  let bestParish = ''
  let bestIndex = Infinity
  for (const parish of parishes) {
    const m = PARISH_HINTS[parish].exec(text)
    if (m && m.index < bestIndex) {
      bestIndex = m.index
      bestParish = parish
    }
  }
  return bestParish
}

// ── Category detection ───────────────────────────────────────────────────────
// Keyword buckets, weighted so the strongest match wins. Order-independent.

const CATEGORY_HINTS: { category: (typeof questCategories)[number]; res: RegExp[] }[] = [
  { category: 'Pets', res: [/\b(?:dog|cat|puppy|kitten|pet|rabbit|hamster|guinea pig|pony|horse|chicken|hen)s?\b/i, /\bdog ?walk/i, /\bcattery|kennel|feed(?:ing)? (?:the|my) (?:dog|cat|pets)\b/i] },
  { category: 'Gardening', res: [/\b(?:garden|lawn|mow(?:ing|er)?|hedge|weed(?:ing)?|grass|prun(?:e|ing)|trim(?:ming)?|planting|flower ?bed|allotment|strimm)/i] },
  { category: 'Tech Help', res: [/\b(?:computer|laptop|pc|wi-?fi|broadband|router|printer|phone|iphone|ipad|tablet|tv|television|email|password|internet|smart ?tv)\b/i, /\bset(?:ting)? up (?:a |the |my )?(?:new )?(?:phone|laptop|computer|email|wi-?fi|printer|tv|account|iphone|ipad)\b/i, /\bgood with (?:computers|tech|it)\b/i] },
  { category: 'Tutoring', res: [/\b(?:tutor|tuition|gcse|a-?level|maths|english|revision|homework|lessons|teach|coaching|exam)s?\b/i] },
  { category: 'Cleaning', res: [/\b(?:clean(?:er|ing)?|tidy|hoover|vacuum|ironing|laundry|declutter|scrub|deep ?clean|end of tenancy)\b/i] },
  { category: 'Moving & Lifting', res: [/\b(?:move|moving|removal|lift(?:ing)?|furniture|sofa|wardrobe|mattress|carry(?:ing)?|van man|flat ?pack|flatpack|assemble|shift(?:ing)?)\b/i] },
  { category: 'Events', res: [/\b(?:party|parties|wedding|event|birthday|christening|bbq|barbecue|caterer|catering|decorat|marquee|set(?:ting)? up (?:tables|chairs)|stalls?)\b/i] },
  { category: 'Errands', res: [/\b(?:shopping|pick ?up|collect|drop ?off|lift to|run to|errand|prescription|pharmacy|post office|babysit|childcare|school run|dog ?sit)\b/i] },
]

export function detectCategory(text: string): string {
  let best = 'Other'
  let bestScore = 0
  for (const { category, res } of CATEGORY_HINTS) {
    const score = res.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = category
    }
  }
  return best
}

// ── Single vs weekly ─────────────────────────────────────────────────────────

const WEEKLY_HINTS =
  /\b(?:every (?:week|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|couple of weeks)|weekly|each week|once a week|twice a week|regular(?:ly)?|ongoing|on(?:-| )going|recurring|long[- ]term|monday to friday|mon(?:day)?[-–to ]+fri(?:day)?|throughout the summer|over the summer)\b/i

export function detectType(text: string): QuestType {
  return WEEKLY_HINTS.test(text) ? 'weekly' : 'single'
}

// ── Schedule / timing ────────────────────────────────────────────────────────

const DAYS = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/i
const RELATIVE =
  /\b(?:this|next|coming) (?:weekend|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening)\b/i

export function extractSchedule(text: string, type: QuestType): string {
  if (type === 'weekly') {
    const every = text.match(
      /\bevery (?:week|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|couple of weeks)\b[^.,!?\n]*/i,
    )
    if (every) return titleCaseFirst(every[0].trim())
    const m2f = text.match(/\bmon(?:day)?[-–\s to]+fri(?:day)?[^.,!?\n]*/i)
    if (m2f) return titleCaseFirst(m2f[0].trim())
    if (/\bweekly\b/i.test(text)) return 'Weekly'
    return 'Ongoing / weekly'
  }
  const rel = text.match(RELATIVE)
  if (rel) return titleCaseFirst(rel[0])
  const dated = text.match(/\b(?:on |by )?\d{1,2}(?:st|nd|rd|th)?(?:\s+of)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i)
  if (dated) return titleCaseFirst(dated[0].replace(/^(on|by)\s+/i, ''))
  const day = text.match(DAYS)
  if (day) return titleCaseFirst(day[0])
  if (/\b(?:asap|as soon as possible|urgent(?:ly)?)\b/i.test(text)) return 'ASAP'
  if (/\b(?:tomorrow)\b/i.test(text)) return 'Tomorrow'
  return ''
}

// ── Reward estimate ──────────────────────────────────────────────────────────
// Use an explicit £ figure if the poster named one; otherwise fall back to a
// sensible per-category rate, nudged by "small/quick" vs "big/all day" cues.

const BASE_REWARD: Record<string, number> = {
  Gardening: 15,
  Pets: 12,
  'Tech Help': 15,
  Tutoring: 20,
  Cleaning: 18,
  'Moving & Lifting': 22,
  Events: 25,
  Errands: 12,
  Other: 15,
}

export function estimateReward(text: string, category: string): number {
  const explicit = text.match(/£\s?(\d{1,4})/)
  if (explicit) {
    const n = Number(explicit[1])
    if (n > 0 && n <= 1000) return n
  }
  let reward = BASE_REWARD[category] ?? 15
  if (/\b(?:quick|small|little|5 ?min|10 ?min|20 ?min|half an hour)\b/i.test(text)) reward = Math.round(reward * 0.7)
  if (/\b(?:big|large|whole|all day|full day|heavy|lots of|major)\b/i.test(text)) reward = Math.round(reward * 1.5)
  return Math.max(5, reward)
}

// ── Title generation ─────────────────────────────────────────────────────────
// Strip the greeting/ask scaffolding and keep the actual thing they need doing.

const LEADING_FILLER = [
  /^(?:hi|hey|hello|morning|evening|good (?:morning|evening|afternoon))\b[\s,!.]*(?:all|everyone|folks|guys|there|people)?[\s,!.]*/i,
  /^(?:does anyone|has anyone|is there anyone|is anyone|can anyone|could anyone|would anyone|can someone|could someone)\b[\s,]*/i,
  /^(?:i'?m |i am |we'?re |we are )?(?:just )?(?:looking (?:for|to find)|after|in need of|in search of|hoping to find|trying to find|wondering if|searching for)\b[\s,]*/i,
  /^(?:i |we )?(?:need|want|require|would like)\b[\s,]*(?:a |an |some |to find |someone to )?/i,
  /^(?:please )?(?:can|could) (?:anyone|someone|you) (?:recommend|help|suggest)\b[\s,]*(?:me )?(?:a |an |with )?/i,
  /^(?:any )?recommendations? (?:for|of|please)?\b[\s,]*(?:a |an |for )?/i,
  /^(?:wanted|help)\b[\s:!.-]*/i,
  /^(?:so|basically|right|ok(?:ay)?)\b[\s,]*/i,
]

export function makeTitle(text: string, category: string, parish: string): string {
  // First sentence / line only.
  let t = text.split(/[\n.!?]/)[0].trim()
  let changed = true
  while (changed) {
    changed = false
    for (const re of LEADING_FILLER) {
      const next = t.replace(re, '')
      if (next !== t) {
        t = next.trim()
        changed = true
      }
    }
  }
  t = t.replace(/\s+/g, ' ').replace(/^[,\s-]+/, '').trim()
  // Drop a trailing "please / thanks / in <area>" tail.
  t = t.replace(/\b(?:please|thanks|thank you|cheers|tia)\b[\s!.]*$/i, '').trim()

  if (t.length < 6) {
    const where = parish || 'Jersey'
    return `${category} help needed in ${where}`
  }
  if (t.length > 64) t = t.slice(0, 61).replace(/\s+\S*$/, '') + '…'
  return titleCaseFirst(t)
}

// ── Description (all of the information added) ────────────────────────────────

export function buildDescription(post: RawPost): string {
  const when = formatDate(post.postedAt)
  const lines = [
    post.text.trim(),
    '',
    '— Imported from the “Jersey Ask Advice” Facebook group.',
    `Originally posted by ${post.author}${when ? ` on ${when}` : ''}.`,
  ]
  if (post.permalink) lines.push(`Source: ${post.permalink}`)
  return lines.join('\n')
}

// ── Top-level: one post → one proposed quest ─────────────────────────────────

export function scrapePost(post: RawPost): ScrapedQuest {
  const analysis = detectHelpRequest(post.text)
  const category = detectCategory(post.text)
  const parish = detectParish(post.text)
  const type = detectType(post.text)
  return {
    source: post,
    isHelpRequest: analysis.isRequest,
    confidence: analysis.confidence,
    reasons: analysis.reasons,
    title: makeTitle(post.text, category, parish),
    description: buildDescription(post),
    category,
    type,
    parish,
    reward: estimateReward(post.text, category),
    schedule: extractSchedule(post.text, type),
  }
}

export function scrapeFeed(posts: RawPost[]): ScrapedQuest[] {
  return posts.map(scrapePost)
}

// ── Parse pasted posts ───────────────────────────────────────────────────────
// So you can literally copy posts out of the group and drop them in. Posts are
// separated by a blank line or a `---` divider. An optional first line of the
// form "Name — 2 July" (or "Name:") is treated as the author/date header.

export function parsePastedFeed(raw: string): RawPost[] {
  const blocks = raw
    .split(/\n\s*(?:-{3,}|—{3,}|\*{3,})\s*\n|\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)

  return blocks.map((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    let author = 'A group member'
    let postedAt = ''
    let body = block.trim()

    const header = lines[0] ?? ''
    const headerMatch = header.match(/^([A-Z][\w'.-]+(?:\s+[A-Z][\w'.-]+){0,3})\s*(?:[—–\-:·]|\bat\b)\s*(.*)$/)
    if (headerMatch && lines.length > 1 && header.length < 60) {
      author = headerMatch[1].trim()
      const rest = headerMatch[2].trim()
      const parsed = Date.parse(rest)
      if (!Number.isNaN(parsed)) postedAt = new Date(parsed).toISOString()
      body = lines.slice(1).join('\n').trim()
    }

    return {
      id: `pasted-${i + 1}`,
      author,
      text: body,
      postedAt,
      permalink: '',
    }
  })
}

// ── A realistic Jersey Ask Advice sample feed ────────────────────────────────
// Used when there are no live credentials (the in-app demo, and the CLI's
// fallback). It's a genuine mix: real-sounding help requests across categories
// and parishes, plus the sale/thank-you/chit-chat traffic the detector must
// screen out — so the "found N, M look like jobs" story is honest. The data
// lives in sampleFeed.json so the headless CLI can read the same snapshot.

export const SAMPLE_FEED: RawPost[] = sampleFeed as RawPost[]

// ── small helpers ────────────────────────────────────────────────────────────

function titleCaseFirst(s: string): string {
  const t = s.trim()
  return t.length ? t[0].toUpperCase() + t.slice(1) : t
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
