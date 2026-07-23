// ─────────────────────────────────────────────────────────────────────────────
// SideQuest — "Jersey Ask Advice" Facebook scraper (headless)
//
//   node scripts/fb-scraper.mjs [--dry-run] [--sample] [--all] [--limit N]
//
// Reads posts from the "Jersey Ask Advice" Facebook group, keeps the ones where
// someone is asking for help, turns each into a SideQuest quest (category,
// parish, single/weekly, reward, schedule) and posts it to the board — crediting
// the original poster in the description and linking back to their post.
//
//   --dry-run   classify and print, don't write anything to Supabase
//   --sample    force the bundled sample feed (skip the live fetch)
//   --all       also post low-confidence matches (default: medium + high only)
//   --limit N   only process the first N detected help requests
//
// LIVE SCRAPING
//   The group is private, so a live fetch needs a logged-in member's session
//   cookie. Set FB_COOKIE (the full Cookie header from a browser session) and,
//   if different from the default slug, FB_GROUP. Without a cookie — or if the
//   fetch fails — the script falls back to sampleFeed.json so it always runs.
//   Only scrape groups you're a member of, and respect Facebook's Terms.
//
// SUPABASE
//   Posts are authored by a dedicated bot account so they show up on the board
//   like any other quest (RLS requires an authenticated poster). Configure with
//   FB_BOT_EMAIL / FB_BOT_PASSWORD / FB_BOT_NAME. Requires the migration in
//   supabase/migrations/0001_init.sql and "Confirm email" turned OFF.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://zqkxmpqsgkqxwkmzzfja.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxa3htcHFzZ2txeHdrbXp6ZmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDgxODksImV4cCI6MjEwMDI4NDE4OX0.nAYDKdC_XgLnzZifOjzYQZq4miz9NV_O-b4vsjNbRlY'

const FB_GROUP = process.env.FB_GROUP || 'jerseyaskadvice'
const FB_COOKIE = process.env.FB_COOKIE || ''
const BOT_EMAIL = process.env.FB_BOT_EMAIL || 'fb-import@sidequest.je'
const BOT_PASSWORD = process.env.FB_BOT_PASSWORD || 'Quest1234!'
const BOT_NAME = process.env.FB_BOT_NAME || 'Jersey Ask Advice (imported)'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const FORCE_SAMPLE = args.has('--sample')
const POST_ALL = args.has('--all')
const limitArg = process.argv.find((a) => a.startsWith('--limit'))
const LIMIT = limitArg ? Number(limitArg.split(/[= ]/)[1] ?? process.argv[process.argv.indexOf(limitArg) + 1]) : Infinity

// ═══════════════════════════════════════════════════════════════════════════
// Classifier — mirrors src/lib/fbScraper.ts (kept self-contained so the script
// runs with bare `node`, matching scripts/seed.mjs).
// ═══════════════════════════════════════════════════════════════════════════

const parishes = [
  'St Helier', 'St Saviour', 'St Clement', 'Grouville', 'St Martin', 'Trinity',
  'St John', 'St Mary', 'St Ouen', 'St Peter', 'St Brelade', 'St Lawrence',
]

const HELP_SIGNALS = [
  [/\bcan (?:anyone|someone|somebody)\b/i, 'asks “can anyone…”'],
  [/\b(?:anyone|someone|somebody) (?:able to|who can|that can|around|available)\b/i, 'asks if anyone is available'],
  [/\bdoes anyone (?:know|do|offer)\b/i, 'asks “does anyone know…”'],
  [/\b(?:can|could) (?:anyone|someone|you) recommend\b/i, 'asks for a recommendation'],
  [/\b(?:recommend|recommendation|recommendations|suggestions) (?:for|of|please|anyone)\b/i, 'asks for recommendations'],
  [/\blooking (?:for|to find)\b/i, 'says “looking for…”'],
  [/\b(?:after|need|needing|want|wanted|requiring|require|in need of)\s+(?:a|an|some|someone|help)\b/i, 'needs someone/something'],
  [/\bneed (?:a )?(?:hand|help)\b/i, 'needs a hand'],
  [/\bhelp (?:with|please|needed|wanted)\b/i, 'asks for help'],
  [/\bwho (?:can|could|does|do i)\b/i, 'asks “who can…”'],
  [/\bany (?:recommendations|one able|good|reliable)\b/i, 'asks for anyone good/reliable'],
  [/\bhappy to pay\b/i, 'offers to pay'],
  [/\bwilling to pay\b/i, 'offers to pay'],
  [/\bwill pay (?:cash|well)?\b/i, 'offers to pay'],
  [/\bpaid (?:work|job|cash)\b/i, 'offers paid work'],
  [/\bwanted\b/i, 'says “wanted”'],
]

const NEGATIVE_SIGNALS = [
  [/\bfor sale\b/i, 'a for-sale post'],
  [/\b(?:selling|i'?m selling|swap|swaps|free to (?:a )?good home)\b/i, 'selling / giving away an item'],
  [/\b(?:thank you|thanks (?:to |so much|everyone)|massive thank)\b/i, 'a thank-you post'],
  [/\bdoes anyone else (?:think|feel|find|get)\b/i, 'an opinion / discussion post'],
  [/\b(?:just a )?(?:psa|heads up|reminder|fyi)\b/i, 'a notice / PSA'],
  [/\b(?:lost|found) (?:dog|cat|keys|wallet|phone|purse)\b/i, 'a lost-and-found post'],
  [/\bfree (?:to collect|collection|stuff)\b/i, 'a freebie post'],
]

function detectHelpRequest(text) {
  const positives = HELP_SIGNALS.filter(([re]) => re.test(text))
  const negatives = NEGATIVE_SIGNALS.filter(([re]) => re.test(text))
  if (negatives.length && positives.length < 2) {
    return { isRequest: false, confidence: 'low', reasons: negatives.map(([, l]) => `Looks like ${l}`) }
  }
  if (positives.length === 0) {
    return { isRequest: false, confidence: 'low', reasons: ['No “looking for help” language found'] }
  }
  const reasons = positives.map(([, l]) => l)
  const paying = /\b(?:pay|cash|paid|£\s?\d)/i.test(text)
  let confidence = 'low'
  if (positives.length >= 3 || (positives.length >= 2 && paying)) confidence = 'high'
  else if (positives.length >= 2 || paying) confidence = 'medium'
  return { isRequest: true, confidence, reasons }
}

const PARISH_HINTS = {
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

function detectParish(text) {
  // Prefer the area mentioned first (e.g. the pickup in "St Aubin to Gorey").
  let bestParish = ''
  let bestIndex = Infinity
  for (const parish of parishes) {
    const m = PARISH_HINTS[parish].exec(text)
    if (m && m.index < bestIndex) { bestIndex = m.index; bestParish = parish }
  }
  return bestParish
}

const CATEGORY_HINTS = [
  ['Pets', [/\b(?:dog|cat|puppy|kitten|pet|rabbit|hamster|guinea pig|pony|horse|chicken|hen)s?\b/i, /\bdog ?walk/i, /\bcattery|kennel|feed(?:ing)? (?:the|my) (?:dog|cat|pets)\b/i]],
  ['Gardening', [/\b(?:garden|lawn|mow(?:ing|er)?|hedge|weed(?:ing)?|grass|prun(?:e|ing)|trim(?:ming)?|planting|flower ?bed|allotment|strimm)/i]],
  ['Tech Help', [/\b(?:computer|laptop|pc|wi-?fi|broadband|router|printer|phone|iphone|ipad|tablet|tv|television|email|password|internet|smart ?tv)\b/i, /\bset(?:ting)? up (?:a |the |my )?(?:new )?(?:phone|laptop|computer|email|wi-?fi|printer|tv|account|iphone|ipad)\b/i, /\bgood with (?:computers|tech|it)\b/i]],
  ['Tutoring', [/\b(?:tutor|tuition|gcse|a-?level|maths|english|revision|homework|lessons|teach|coaching|exam)s?\b/i]],
  ['Cleaning', [/\b(?:clean(?:er|ing)?|tidy|hoover|vacuum|ironing|laundry|declutter|scrub|deep ?clean|end of tenancy)\b/i]],
  ['Moving & Lifting', [/\b(?:move|moving|removal|lift(?:ing)?|furniture|sofa|wardrobe|mattress|carry(?:ing)?|van man|flat ?pack|flatpack|assemble|shift(?:ing)?)\b/i]],
  ['Events', [/\b(?:party|parties|wedding|event|birthday|christening|bbq|barbecue|caterer|catering|decorat|marquee|set(?:ting)? up (?:tables|chairs)|stalls?)\b/i]],
  ['Errands', [/\b(?:shopping|pick ?up|collect|drop ?off|lift to|run to|errand|prescription|pharmacy|post office|babysit|childcare|school run|dog ?sit)\b/i]],
]

function detectCategory(text) {
  let best = 'Other'
  let bestScore = 0
  for (const [category, res] of CATEGORY_HINTS) {
    const score = res.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = category }
  }
  return best
}

const WEEKLY_HINTS =
  /\b(?:every (?:week|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|couple of weeks)|weekly|each week|once a week|twice a week|regular(?:ly)?|ongoing|on(?:-| )going|recurring|long[- ]term|monday to friday|mon(?:day)?[-–to ]+fri(?:day)?|throughout the summer|over the summer)\b/i

function detectType(text) {
  return WEEKLY_HINTS.test(text) ? 'weekly' : 'single'
}

const DAYS = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/i
const RELATIVE = /\b(?:this|next|coming) (?:weekend|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening)\b/i

function titleCaseFirst(s) {
  const t = s.trim()
  return t.length ? t[0].toUpperCase() + t.slice(1) : t
}

function extractSchedule(text, type) {
  if (type === 'weekly') {
    const every = text.match(/\bevery (?:week|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|couple of weeks)\b[^.,!?\n]*/i)
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
  if (/\btomorrow\b/i.test(text)) return 'Tomorrow'
  return ''
}

const BASE_REWARD = {
  Gardening: 15, Pets: 12, 'Tech Help': 15, Tutoring: 20, Cleaning: 18,
  'Moving & Lifting': 22, Events: 25, Errands: 12, Other: 15,
}

function estimateReward(text, category) {
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

function makeTitle(text, category, parish) {
  let t = text.split(/[\n.!?]/)[0].trim()
  let changed = true
  while (changed) {
    changed = false
    for (const re of LEADING_FILLER) {
      const next = t.replace(re, '')
      if (next !== t) { t = next.trim(); changed = true }
    }
  }
  t = t.replace(/\s+/g, ' ').replace(/^[,\s-]+/, '').trim()
  t = t.replace(/\b(?:please|thanks|thank you|cheers|tia)\b[\s!.]*$/i, '').trim()
  if (t.length < 6) return `${category} help needed in ${parish || 'Jersey'}`
  if (t.length > 64) t = t.slice(0, 61).replace(/\s+\S*$/, '') + '…'
  return titleCaseFirst(t)
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function buildDescription(post) {
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

const xpForReward = (r) => Math.max(30, Math.round(r) * 10)

function scrapePost(post) {
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
    category, type, parish,
    reward: estimateReward(post.text, category),
    schedule: extractSchedule(post.text, type),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Fetching the feed
// ═══════════════════════════════════════════════════════════════════════════

function sampleFeed() {
  const raw = readFileSync(join(__dirname, '..', 'src', 'lib', 'sampleFeed.json'), 'utf8')
  return JSON.parse(raw)
}

// Best-effort live fetch of a group's posts via mbasic.facebook.com using a
// member's session cookie. Facebook markup changes often; on any problem we
// return null so the caller falls back to the sample feed.
async function fetchLivePosts(group, cookie) {
  const url = `https://mbasic.facebook.com/groups/${encodeURIComponent(group)}`
  try {
    const res = await fetch(url, {
      headers: {
        cookie,
        'user-agent':
          'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
        'accept-language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    })
    if (!res.ok) {
      console.warn(`   ! live fetch HTTP ${res.status} — using sample feed`)
      return null
    }
    const html = await res.text()
    if (/login|log in to continue|you must log in/i.test(html) && !/data-ft=/.test(html)) {
      console.warn('   ! session cookie rejected (login wall) — using sample feed')
      return null
    }
    const posts = parseMbasicPosts(html, group)
    if (posts.length === 0) {
      console.warn('   ! no posts parsed from live HTML — using sample feed')
      return null
    }
    return posts
  } catch (err) {
    console.warn(`   ! live fetch failed (${err.message}) — using sample feed`)
    return null
  }
}

// Extract author + text blocks from mbasic group HTML. Deliberately forgiving:
// mbasic wraps each story in an <article> with a data-ft attribute; the poster's
// name is the first <strong>/<h3> link and the body is the story text.
function parseMbasicPosts(html, group) {
  const posts = []
  const articles = html.split(/<article\b/i).slice(1)
  articles.forEach((chunk, i) => {
    const author = decodeHtml(firstMatch(chunk, /<(?:strong|h3)[^>]*>\s*<a[^>]*>([^<]{2,60})<\/a>/i)) || 'A group member'
    // Story body: grab the first sizeable text container, strip tags.
    const bodyHtml = firstMatch(chunk, /<div[^>]*data-ft="[^"]*"[^>]*>([\s\S]{20,1200}?)<\/div>/i) ||
      firstMatch(chunk, /<p>([\s\S]{20,1200}?)<\/p>/i)
    const text = bodyHtml ? decodeHtml(stripTags(bodyHtml)).replace(/\s+/g, ' ').trim() : ''
    const permId = firstMatch(chunk, /\/groups\/[^"']*?(?:permalink|posts)\/(\d+)/i)
    if (text.length < 15) return
    posts.push({
      id: permId ? `fb-${permId}` : `fb-live-${i + 1}`,
      author,
      text,
      postedAt: '',
      permalink: permId
        ? `https://www.facebook.com/groups/${group}/posts/${permId}`
        : `https://www.facebook.com/groups/${group}`,
    })
  })
  return posts
}

function firstMatch(s, re) {
  const m = s.match(re)
  return m ? m[1] : ''
}
function stripTags(s) {
  return s.replace(/<br\s*\/?>(?=)/gi, '\n').replace(/<[^>]+>/g, ' ')
}
function decodeHtml(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
}

// ═══════════════════════════════════════════════════════════════════════════
// Supabase — sign in the bot and post quests
// ═══════════════════════════════════════════════════════════════════════════

async function botClient() {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.auth.signUp({
    email: BOT_EMAIL, password: BOT_PASSWORD, options: { data: { name: BOT_NAME } },
  })
  if (error && !/already registered/i.test(error.message)) throw error
  let userId = data?.user?.id
  if (!data?.session) {
    const { data: si, error: se } = await sb.auth.signInWithPassword({ email: BOT_EMAIL, password: BOT_PASSWORD })
    if (se) throw new Error(`${se.message} (is email confirmation off?)`)
    userId = si.user.id
  }
  await sb.from('profiles').update({
    name: BOT_NAME,
    bio: 'Community help requests imported from the “Jersey Ask Advice” Facebook group.',
  }).eq('id', userId)
  return { sb, userId }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function run() {
  console.log('\n🔎 SideQuest · Jersey Ask Advice scraper\n')

  // 1) Get posts.
  let posts = null
  if (!FORCE_SAMPLE && FB_COOKIE) {
    console.log(`Fetching live posts from group "${FB_GROUP}"…`)
    posts = await fetchLivePosts(FB_GROUP, FB_COOKIE)
  } else if (!FORCE_SAMPLE) {
    console.log('No FB_COOKIE set — using the bundled sample feed.')
  }
  if (!posts) posts = sampleFeed()
  console.log(`Scanned ${posts.length} posts.\n`)

  // 2) Classify.
  const scraped = posts.map(scrapePost)
  const minRank = POST_ALL ? 0 : 1 // low=0, medium=1, high=2
  const rank = { low: 0, medium: 1, high: 2 }
  const help = scraped.filter((s) => s.isHelpRequest && rank[s.confidence] >= minRank)
  const skipped = scraped.length - help.length
  const selected = help.slice(0, LIMIT)

  console.log(`Found ${help.length} help request(s); skipping ${skipped} other post(s).`)
  if (POST_ALL === false) console.log('(Low-confidence matches excluded — pass --all to include them.)')
  console.log('')

  for (const s of selected) {
    console.log(`• [${s.confidence}] ${s.title}`)
    console.log(`    ${s.category} · ${s.parish || 'Jersey'} · ${s.type} · £${s.reward}${s.schedule ? ` · ${s.schedule}` : ''}`)
    console.log(`    from ${s.source.author}`)
  }
  console.log('')

  if (DRY_RUN) {
    console.log('Dry run — nothing written to Supabase.\n')
    return
  }
  if (selected.length === 0) {
    console.log('Nothing to post.\n')
    return
  }

  // 3) Post to the board as the bot.
  console.log('Signing in the import bot…')
  const { sb, userId } = await botClient()

  // Skip anything already imported (match on title among the bot's quests).
  const { data: existing } = await sb.from('quests').select('title').eq('poster_id', userId)
  const already = new Set((existing ?? []).map((q) => q.title))

  let posted = 0
  let dup = 0
  for (const s of selected) {
    if (already.has(s.title)) { dup++; continue }
    const { error } = await sb.from('quests').insert({
      poster_id: userId,
      title: s.title,
      description: s.description,
      category: s.category,
      type: s.type,
      parish: s.parish,
      reward: Math.max(0, Math.round(s.reward)),
      xp_reward: xpForReward(s.reward),
      schedule: s.schedule,
      party_size: 1,
    })
    if (error) { console.warn(`   ! "${s.title}": ${error.message}`); continue }
    posted++
  }

  console.log(`\n✓ Posted ${posted} quest(s) to the board${dup ? `, skipped ${dup} already imported` : ''}.`)
  console.log(`  Board author: ${BOT_NAME} (${BOT_EMAIL})\n`)
}

run().catch((e) => {
  console.error('\nScraper failed:', e.message)
  process.exit(1)
})
