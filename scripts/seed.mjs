// ─────────────────────────────────────────────────────────────────────────────
// SideQuest — demo data seeder
//
//   node scripts/seed.mjs
//
// Creates a range of Quest Poster + Quest Doer accounts and a board full of
// quests across every parish, then has some doers apply so posters have
// applicants to review. All accounts share the same password (printed below).
//
// Requirements:
//   1. Run the migration in supabase/migrations/0001_init.sql first.
//   2. Turn OFF "Confirm email" (Auth → Providers → Email) so accounts are
//      usable immediately. Otherwise signUp won't return a session and seeding
//      of that account's data will be skipped.
//
// The anon key below is the publishable key (safe to commit); RLS protects data.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://zqkxmpqsgkqxwkmzzfja.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxa3htcHFzZ2txeHdrbXp6ZmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDgxODksImV4cCI6MjEwMDI4NDE4OX0.nAYDKdC_XgLnzZifOjzYQZq4miz9NV_O-b4vsjNbRlY'

const PASSWORD = 'Quest1234!'

// Fresh client per user so each keeps its own session (no shared auth state).
function client() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Sign up (or sign in if the account already exists). Returns { sb, userId }.
async function auth(email, meta) {
  const sb = client()
  const { data, error } = await sb.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: meta },
  })
  if (error && !/already registered/i.test(error.message)) throw error

  if (!data?.session) {
    const { data: si, error: se } = await sb.auth.signInWithPassword({
      email,
      password: PASSWORD,
    })
    if (se) {
      console.warn(`   ! ${email}: ${se.message} (is email confirmation off?)`)
      return null
    }
    return { sb, userId: si.user.id }
  }
  return { sb, userId: data.user.id }
}

// ── Posters ──────────────────────────────────────────────────────────────────
const posters = [
  { name: 'Margaret Le Brun', email: 'margaret.poster@sidequest.je', kind: 'resident', parish: 'St Helier', verified: true, about: 'Retired teacher who needs a hand around the house.' },
  { name: 'The Green Thumb Café', email: 'greenthumb.poster@sidequest.je', kind: 'business', parish: 'St Brelade', verified: true, about: 'Independent café by the harbour.' },
  { name: 'David Ozouf', email: 'david.poster@sidequest.je', kind: 'resident', parish: 'St Ouen', verified: false, about: 'Keen gardener with a big plot.' },
  { name: 'Trinity Riding Stables', email: 'trinity.poster@sidequest.je', kind: 'business', parish: 'Trinity', verified: true, about: 'Family-run stables needing weekend hands.' },
  { name: 'Sophie Gruchy', email: 'sophie.poster@sidequest.je', kind: 'resident', parish: 'St Saviour', verified: false, about: 'Busy mum of three.' },
  { name: 'La Rocque Hardware', email: 'larocque.poster@sidequest.je', kind: 'business', parish: 'Grouville', verified: true, about: 'Local hardware shop.' },
  { name: 'Peter Vibert', email: 'peter.poster@sidequest.je', kind: 'resident', parish: 'St Martin', verified: false, about: 'Sea-view bungalow, always something to do.' },
  { name: 'St Peter Community Hall', email: 'stpeterhall.poster@sidequest.je', kind: 'business', parish: 'St Peter', verified: true, about: 'Village hall running regular events.' },
]

// ── Doers ────────────────────────────────────────────────────────────────────
const doers = [
  { name: 'Charlie Renouf', email: 'charlie.doer@sidequest.je', parish: 'St Helier', xp: 40, done: 0, skills: ['Gardening', 'Lifting & moving'], bio: 'Year 12, happy to get stuck in.' },
  { name: 'Amélie Bisson', email: 'amelie.doer@sidequest.je', parish: 'St Saviour', xp: 180, done: 3, skills: ['Tutoring', 'Babysitting'], bio: 'A-level maths student, great with kids.' },
  { name: 'Tom Le Feuvre', email: 'tom.doer@sidequest.je', parish: 'St Brelade', xp: 520, done: 8, skills: ['Tech support', 'Photography'], bio: 'Comp-sci hopeful, fixes anything with a plug.' },
  { name: 'Priya Gallichan', email: 'priya.doer@sidequest.je', parish: 'St Clement', xp: 90, done: 1, skills: ['Dog walking', 'Cleaning'], bio: 'Loves animals, reliable and punctual.' },
  { name: 'Ollie de la Haye', email: 'ollie.doer@sidequest.je', parish: 'St Ouen', xp: 900, done: 14, skills: ['Painting', 'Event setup', 'Lifting & moving'], bio: 'Strong, practical, weekend warrior.' },
  { name: 'Hana Ahier', email: 'hana.doer@sidequest.je', parish: 'Trinity', xp: 300, done: 5, skills: ['Gardening', 'Cooking'], bio: 'Keen cook and green-fingered.' },
  { name: 'Marcus Vautier', email: 'marcus.doer@sidequest.je', parish: 'Grouville', xp: 1600, done: 22, skills: ['Tech support', 'Tutoring', 'Car washing'], bio: 'Local Legend in training. Does it all.' },
  { name: 'Isla Journeaux', email: 'isla.doer@sidequest.je', parish: 'St Martin', xp: 60, done: 0, skills: ['Babysitting', 'Cleaning'], bio: 'Friendly and trustworthy, DBS on request.' },
  { name: 'Ben Syvret', email: 'ben.doer@sidequest.je', parish: 'St Peter', xp: 240, done: 4, skills: ['Lifting & moving', 'Gardening'], bio: 'Rugby player, happy to do the heavy stuff.' },
  { name: 'Freya Mourant', email: 'freya.doer@sidequest.je', parish: 'St Lawrence', xp: 420, done: 6, skills: ['Dog walking', 'Photography', 'Event setup'], bio: 'Reliable all-rounder with a bike.' },
]

// ── Quests (assigned to a poster by index) ───────────────────────────────────
const quests = [
  { p: 0, title: 'Mow the front and back lawn', category: 'Gardening', type: 'single', parish: 'St Helier', reward: 15, schedule: 'Sat 12 Jul, 10am', bus: true, party: 1, desc: 'Petrol mower provided. Should take about 90 minutes.' },
  { p: 0, title: 'Weekly bin & recycling run', category: 'Errands', type: 'weekly', parish: 'St Helier', reward: 5, schedule: 'Every Tuesday evening', bus: true, party: 1, desc: 'Wheel the bins out and back each week.' },
  { p: 1, title: 'Saturday morning café setup crew', category: 'Events', type: 'weekly', parish: 'St Brelade', reward: 24, schedule: 'Every Saturday, 7–9am', bus: true, party: 3, desc: 'Set out tables, chairs and parasols before opening. Great team gig.' },
  { p: 1, title: 'Help move a delivery of flour sacks', category: 'Moving & Lifting', type: 'single', parish: 'St Brelade', reward: 18, schedule: 'Thu 10 Jul, 8am', bus: true, party: 2, desc: 'Carry sacks from the van to the back store. Bring good shoes.' },
  { p: 2, title: 'Weed and mulch the veg beds', category: 'Gardening', type: 'single', parish: 'St Ouen', reward: 30, schedule: 'Sun 13 Jul, all morning', bus: false, party: 2, desc: 'Big plot, lots of weeding. Tools and gloves provided, plus lunch.' },
  { p: 2, title: 'Water the greenhouse tomatoes', category: 'Gardening', type: 'weekly', parish: 'St Ouen', reward: 8, schedule: 'Every Wednesday', bus: false, party: 1, desc: 'Quick 20-minute job while I’m at work. Key left in the usual spot.' },
  { p: 3, title: 'Weekend stable mucking-out', category: 'Pets', type: 'weekly', parish: 'Trinity', reward: 20, schedule: 'Sat & Sun mornings', bus: false, party: 2, desc: 'Muck out stalls and refill hay. Wellies essential. Ponies are friendly!' },
  { p: 3, title: 'Exercise and groom the ponies', category: 'Pets', type: 'weekly', parish: 'Trinity', reward: 16, schedule: 'Wednesdays after school', bus: false, party: 1, desc: 'Lead the ponies round the paddock and brush them down.' },
  { p: 4, title: 'Babysit two kids on Friday night', category: 'Errands', type: 'single', parish: 'St Saviour', reward: 25, schedule: 'Fri 11 Jul, 6–10pm', bus: true, party: 1, desc: 'Two well-behaved children (6 & 8). Dinner sorted, just need games and bedtime.' },
  { p: 4, title: 'Deep clean the kitchen', category: 'Cleaning', type: 'single', parish: 'St Saviour', reward: 22, schedule: 'Mon 14 Jul', bus: true, party: 1, desc: 'Oven, cupboards and floor. Products provided.' },
  { p: 5, title: 'Weekend delivery driver’s helper', category: 'Moving & Lifting', type: 'weekly', parish: 'Grouville', reward: 28, schedule: 'Saturdays, 9am–1pm', bus: true, party: 1, desc: 'Ride along and carry deliveries to customers’ doors.' },
  { p: 5, title: 'Restock and tidy the paint aisle', category: 'Cleaning', type: 'single', parish: 'Grouville', reward: 14, schedule: 'Wed 9 Jul', bus: true, party: 1, desc: 'Face up shelves and sweep the aisle.' },
  { p: 6, title: 'Fix Nan’s iPad and printer', category: 'Tech Help', type: 'single', parish: 'St Martin', reward: 12, schedule: 'Any weekday afternoon', bus: false, party: 1, desc: 'Emails won’t send and the printer won’t connect. Patience appreciated!' },
  { p: 6, title: 'Wash and wax the car', category: 'Errands', type: 'single', parish: 'St Martin', reward: 15, schedule: 'Sun 13 Jul', bus: false, party: 1, desc: 'Hose, bucket and wax all provided.' },
  { p: 7, title: 'Set up the parish summer fête', category: 'Events', type: 'single', parish: 'St Peter', reward: 45, schedule: 'Fri 18 Jul, 4–8pm', bus: true, party: 4, desc: 'Put up gazebos, bunting and stalls for the big weekend. Pizza for the crew!' },
  { p: 7, title: 'Weekly hall clean after events', category: 'Cleaning', type: 'weekly', parish: 'St Peter', reward: 18, schedule: 'Every Sunday evening', bus: true, party: 2, desc: 'Sweep, mop and stack chairs after the weekend’s bookings.' },
  { p: 0, title: 'Tutor GCSE maths, once a week', category: 'Tutoring', type: 'weekly', parish: 'St Helier', reward: 20, schedule: 'Thursdays, 5–6pm', bus: true, party: 1, desc: 'Help my grandson with algebra and revision.' },
  { p: 2, title: 'Dog walking while I’m away', category: 'Pets', type: 'weekly', parish: 'St Ouen', reward: 12, schedule: 'Daily for two weeks', bus: false, party: 1, desc: 'Friendly labrador needs a good walk each afternoon.' },
]

function xpForReward(reward) {
  return Math.max(30, Math.round(reward) * 10)
}

async function run() {
  console.log('\nSeeding SideQuest demo data…\n')

  // Posters + their quests.
  const posterCtx = []
  const questRows = [] // { row, sb } after insert to allow applications
  for (const p of posters) {
    const res = await auth(p.email, { role: 'poster', name: p.name, kind: p.kind, parish: p.parish })
    if (!res) { posterCtx.push(null); continue }
    const { sb, userId } = res
    await sb.from('posters').update({
      name: p.name, kind: p.kind, parish: p.parish, about: p.about,
      community_verified: p.verified,
    }).eq('id', userId)
    posterCtx.push({ sb, userId })
    console.log(`✓ poster  ${p.email}`)
  }

  const createdQuests = []
  for (const q of quests) {
    const ctx = posterCtx[q.p]
    if (!ctx) continue
    const { data, error } = await ctx.sb.from('quests').insert({
      poster_id: ctx.userId,
      title: q.title, description: q.desc, category: q.category, type: q.type,
      parish: q.parish, reward: q.reward, xp_reward: xpForReward(q.reward),
      schedule: q.schedule, bus_friendly: q.bus, party_size: q.party,
    }).select('id, party_size').single()
    if (error) { console.warn(`   ! quest "${q.title}": ${error.message}`); continue }
    createdQuests.push(data)
  }
  console.log(`✓ ${createdQuests.length} quests posted`)

  // Doers + profiles.
  const doerCtx = []
  for (const d of doers) {
    const res = await auth(d.email, { role: 'doer', name: d.name, parish: d.parish })
    if (!res) { doerCtx.push(null); continue }
    const { sb, userId } = res
    await sb.from('doers').update({
      name: d.name, parish: d.parish, bio: d.bio, skills: d.skills,
      xp: d.xp, quests_done: d.done,
    }).eq('id', userId)
    doerCtx.push({ sb, userId })
    console.log(`✓ doer    ${d.email}`)
  }

  // A few applications so posters have someone to review.
  let apps = 0
  for (let i = 0; i < createdQuests.length; i++) {
    const q = createdQuests[i]
    const applicants = [doerCtx[i % doerCtx.length], doerCtx[(i + 3) % doerCtx.length]]
    for (const a of applicants) {
      if (!a) continue
      const { error } = await a.sb.from('applications').insert({
        quest_id: q.id, doer_id: a.userId,
        message: 'Hi! I’d love to help with this one — I’m local and available.',
      })
      if (!error) apps++
    }
  }
  console.log(`✓ ${apps} applications submitted\n`)

  console.log('Done! Log in with any of these (password for all: ' + PASSWORD + ')\n')
  console.log('POSTERS:')
  posters.forEach((p) => console.log(`  ${p.email}`))
  console.log('\nDOERS:')
  doers.forEach((d) => console.log(`  ${d.email}`))
  console.log('')
}

run().catch((e) => {
  console.error('\nSeed failed:', e.message)
  process.exit(1)
})
