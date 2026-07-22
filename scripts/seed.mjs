// ─────────────────────────────────────────────────────────────────────────────
// SideQuest — demo data seeder
//
//   node scripts/seed.mjs
//
// Creates a range of accounts (everyone can both post and do quests), a board
// full of quests across every parish, and some applications so there are
// applicants to review. All accounts share the same password (printed below).
//
// Requirements:
//   1. Run the migration in supabase/migrations/0001_init.sql first.
//   2. Turn OFF "Confirm email" (Auth → Providers → Email).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://zqkxmpqsgkqxwkmzzfja.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxa3htcHFzZ2txeHdrbXp6ZmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDgxODksImV4cCI6MjEwMDI4NDE4OX0.nAYDKdC_XgLnzZifOjzYQZq4miz9NV_O-b4vsjNbRlY'

const PASSWORD = 'Quest1234!'

function client() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function auth(email, meta) {
  const sb = client()
  const { data, error } = await sb.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: meta },
  })
  if (error && !/already registered/i.test(error.message)) throw error
  if (!data?.session) {
    const { data: si, error: se } = await sb.auth.signInWithPassword({ email, password: PASSWORD })
    if (se) {
      console.warn(`   ! ${email}: ${se.message} (is email confirmation off?)`)
      return null
    }
    return { sb, userId: si.user.id }
  }
  return { sb, userId: data.user.id }
}

// ── Accounts (everyone can post and do) ──────────────────────────────────────
const people = [
  { name: 'Margaret Le Brun', email: 'margaret@sidequest.je', parish: 'St Helier', xp: 260, done: 4, skills: ['Gardening', 'Baking'], bio: 'Retired teacher, always something to do around the house.' },
  { name: 'The Green Thumb Café', email: 'greenthumb@sidequest.je', parish: 'St Brelade', xp: 0, done: 0, skills: ['Events', 'Hospitality'], bio: 'Independent café by the harbour.' },
  { name: 'David Ozouf', email: 'david@sidequest.je', parish: 'St Ouen', xp: 120, done: 2, skills: ['Gardening', 'DIY'], bio: 'Keen gardener with a big plot.' },
  { name: 'Trinity Riding Stables', email: 'trinity@sidequest.je', parish: 'Trinity', xp: 0, done: 0, skills: ['Animals'], bio: 'Family-run stables needing weekend hands.' },
  { name: 'Sophie Gruchy', email: 'sophie@sidequest.je', parish: 'St Saviour', xp: 60, done: 1, skills: ['Cleaning', 'Childcare'], bio: 'Busy mum of three.' },
  { name: 'La Rocque Hardware', email: 'larocque@sidequest.je', parish: 'Grouville', xp: 0, done: 0, skills: ['Retail'], bio: 'Local hardware shop.' },
  { name: 'Charlie Renouf', email: 'charlie@sidequest.je', parish: 'St Helier', xp: 40, done: 0, skills: ['Gardening', 'Lifting & moving'], bio: 'Year 12, happy to get stuck in.' },
  { name: 'Amélie Bisson', email: 'amelie@sidequest.je', parish: 'St Saviour', xp: 180, done: 3, skills: ['Tutoring', 'Babysitting'], bio: 'A-level maths student, great with kids.' },
  { name: 'Tom Le Feuvre', email: 'tom@sidequest.je', parish: 'St Brelade', xp: 520, done: 8, skills: ['Tech support', 'Photography'], bio: 'Fixes anything with a plug.' },
  { name: 'Priya Gallichan', email: 'priya@sidequest.je', parish: 'St Clement', xp: 90, done: 1, skills: ['Dog walking', 'Cleaning'], bio: 'Loves animals, reliable and punctual.' },
  { name: 'Ollie de la Haye', email: 'ollie@sidequest.je', parish: 'St Ouen', xp: 900, done: 14, skills: ['Painting', 'Event setup', 'Lifting & moving'], bio: 'Strong, practical, weekend warrior.' },
  { name: 'Marcus Vautier', email: 'marcus@sidequest.je', parish: 'Grouville', xp: 1600, done: 22, skills: ['Tech support', 'Tutoring', 'Car washing'], bio: 'Local Legend in training. Does it all.' },
]

// ── Quests, assigned to an account by index ──────────────────────────────────
const quests = [
  { p: 0, title: 'Mow the front and back lawn', category: 'Gardening', type: 'single', parish: 'St Helier', reward: 15, schedule: 'Sat 12 Jul, 10am', party: 1, desc: 'Petrol mower provided. About 90 minutes.' },
  { p: 0, title: 'Weekly bin & recycling run', category: 'Errands', type: 'weekly', parish: 'St Helier', reward: 5, schedule: 'Every Tuesday evening', party: 1, desc: 'Wheel the bins out and back each week.' },
  { p: 1, title: 'Saturday morning café setup crew', category: 'Events', type: 'weekly', parish: 'St Brelade', reward: 24, schedule: 'Every Saturday, 7–9am', party: 3, desc: 'Set out tables, chairs and parasols before opening. Team gig.' },
  { p: 1, title: 'Move a delivery of flour sacks', category: 'Moving & Lifting', type: 'single', parish: 'St Brelade', reward: 18, schedule: 'Thu 10 Jul, 8am', party: 2, desc: 'Carry sacks from the van to the back store.' },
  { p: 2, title: 'Weed and mulch the veg beds', category: 'Gardening', type: 'single', parish: 'St Ouen', reward: 30, schedule: 'Sun 13 Jul, morning', party: 2, desc: 'Big plot, lots of weeding. Tools and lunch provided.' },
  { p: 2, title: 'Water the greenhouse tomatoes', category: 'Gardening', type: 'weekly', parish: 'St Ouen', reward: 8, schedule: 'Every Wednesday', party: 1, desc: 'Quick 20-minute job while I’m at work.' },
  { p: 3, title: 'Weekend stable mucking-out', category: 'Pets', type: 'weekly', parish: 'Trinity', reward: 20, schedule: 'Sat & Sun mornings', party: 2, desc: 'Muck out stalls and refill hay. Ponies are friendly!' },
  { p: 3, title: 'Exercise and groom the ponies', category: 'Pets', type: 'weekly', parish: 'Trinity', reward: 16, schedule: 'Wednesdays after school', party: 1, desc: 'Lead the ponies round the paddock and brush them down.' },
  { p: 4, title: 'Babysit two kids on Friday night', category: 'Errands', type: 'single', parish: 'St Saviour', reward: 25, schedule: 'Fri 11 Jul, 6–10pm', party: 1, desc: 'Two well-behaved children (6 & 8). Games and bedtime.' },
  { p: 4, title: 'Deep clean the kitchen', category: 'Cleaning', type: 'single', parish: 'St Saviour', reward: 22, schedule: 'Mon 14 Jul', party: 1, desc: 'Oven, cupboards and floor. Products provided.' },
  { p: 5, title: 'Weekend delivery driver’s helper', category: 'Moving & Lifting', type: 'weekly', parish: 'Grouville', reward: 28, schedule: 'Saturdays, 9am–1pm', party: 1, desc: 'Ride along and carry deliveries to customers’ doors.' },
  { p: 5, title: 'Restock and tidy the paint aisle', category: 'Cleaning', type: 'single', parish: 'Grouville', reward: 14, schedule: 'Wed 9 Jul', party: 1, desc: 'Face up shelves and sweep the aisle.' },
  { p: 6, title: 'Wash and wax the car', category: 'Errands', type: 'single', parish: 'St Helier', reward: 15, schedule: 'Sun 13 Jul', party: 1, desc: 'Hose, bucket and wax all provided.' },
  { p: 8, title: 'Fix Nan’s iPad and printer', category: 'Tech Help', type: 'single', parish: 'St Brelade', reward: 12, schedule: 'Any weekday afternoon', party: 1, desc: 'Emails won’t send and the printer won’t connect.' },
  { p: 2, title: 'Dog walking while I’m away', category: 'Pets', type: 'weekly', parish: 'St Ouen', reward: 12, schedule: 'Daily for two weeks', party: 1, desc: 'Friendly labrador needs a good walk each afternoon.' },
  { p: 0, title: 'Tutor GCSE maths, once a week', category: 'Tutoring', type: 'weekly', parish: 'St Helier', reward: 20, schedule: 'Thursdays, 5–6pm', party: 1, desc: 'Help my grandson with algebra and revision.' },
]

const xpForReward = (r) => Math.max(30, Math.round(r) * 10)

async function run() {
  console.log('\nSeeding SideQuest demo data…\n')

  const ctx = []
  for (const person of people) {
    const res = await auth(person.email, { name: person.name, parish: person.parish })
    if (!res) { ctx.push(null); continue }
    const { sb, userId } = res
    await sb.from('profiles').update({
      name: person.name, parish: person.parish, bio: person.bio,
      skills: person.skills, xp: person.xp, quests_done: person.done,
    }).eq('id', userId)
    ctx.push({ sb, userId })
    console.log(`✓ account ${person.email}`)
  }

  const created = []
  for (const q of quests) {
    const c = ctx[q.p]
    if (!c) continue
    const { data, error } = await c.sb.from('quests').insert({
      poster_id: c.userId,
      title: q.title, description: q.desc, category: q.category, type: q.type,
      parish: q.parish, reward: q.reward, xp_reward: xpForReward(q.reward),
      schedule: q.schedule, party_size: q.party,
    }).select('id').single()
    if (error) { console.warn(`   ! quest "${q.title}": ${error.message}`); continue }
    created.push({ ...data, owner: q.p })
  }
  console.log(`✓ ${created.length} quests posted`)

  // Applications: pick a couple of applicants who don't own the quest.
  let apps = 0
  for (let i = 0; i < created.length; i++) {
    const cq = created[i]
    const candidates = [ctx[(cq.owner + 6) % ctx.length], ctx[(cq.owner + 9) % ctx.length]]
    for (const a of candidates) {
      if (!a || a.userId === ctx[cq.owner]?.userId) continue
      const { error } = await a.sb.from('applications').insert({
        quest_id: cq.id, doer_id: a.userId,
        message: 'Hi! I’d love to help with this — I’m local and available.',
      })
      if (!error) apps++
    }
  }
  console.log(`✓ ${apps} applications submitted\n`)

  console.log(`Done! Log in with any of these (password for all: ${PASSWORD})\n`)
  people.forEach((p) => console.log(`  ${p.email}`))
  console.log('')
}

run().catch((e) => {
  console.error('\nSeed failed:', e.message)
  process.exit(1)
})
