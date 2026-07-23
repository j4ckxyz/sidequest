# SideQuest

**Turn community chores into completed quests.** Earn money, help neighbours, and conquer the Rock.

SideQuest is a gamified local-jobs marketplace for Jersey. Residents and small businesses (**Quest Posters**) list single-time or weekly tasks; local teens and students (**Quest Doers**) grab them, team up in parties, chat safely, and level up with XP. Real accounts, real quests, live chat — backed by Supabase.

## Feature ecosystem

1. **Two-sided accounts & XP system** — Doers get a gamified profile with a Jersey-red **XP progress bar**, earning XP on every completed quest and ranking up from *Novice Adventurer* to *Local Legend*. Posters manage listings, review applicants, carry a **Community Verified** badge, and release payment + XP on completion.
2. **The Quest Board (Guilds)** — A live marketplace organised by Jersey's 12 **parish Guilds**. Filter **Single-time** vs **Weekly** quests and spot **Bus-Route-Friendly** tasks for non-drivers.
3. **Quest Party (group gigs)** — Posters set a **party size** for bigger jobs; doers fill the open slots and the reward splits equally.
4. **Safe-Chat (Supabase Realtime)** — Live messaging attached to each quest so posters and doers coordinate without swapping phone numbers.
5. **Facebook Import (Jersey Ask Advice)** — Scan the island's busiest help-request group, automatically spot the posts where someone needs a hand, and turn each one into a fully drafted quest — category, parish Guild, single/weekly, a fair reward and the timing all filled in — ready to post to the board in a tap. Available both in-app (**FB Import** tab) and as a headless CLI.

Everything starts **empty** — no seed data. You see exactly what a real first user sees.

## Facebook Import — how it works

Jersey's "Jersey Ask Advice" group is full of people asking for exactly the kind
of jobs SideQuest exists for ("can anyone recommend someone to mow my lawn…",
"looking for a dog walker Mon–Fri…"). The importer reads those posts and drafts
a quest for each real help request.

- **The brain** — [`src/lib/fbScraper.ts`](src/lib/fbScraper.ts) is a pure,
  shared module that: detects whether a post is a *help request* (and screens out
  for-sale / thank-you / chit-chat traffic), maps Jersey towns and landmarks onto
  the 12 parish Guilds, classifies the job **category**, decides **single vs
  weekly**, estimates a **reward** (using an explicit £ figure when the poster
  named one), extracts the **timing**, writes a clean **title**, and builds a
  **description** that credits the original poster and links back to their post.
- **In the app** — the **FB Import** tab scans the group (or lets you paste real
  posts), shows each detected request as an editable draft quest beside the
  original, and posts it to the board with one tap. Skipped posts are listed with
  the reason, so nothing is a black box.
- **Headless** — [`scripts/fb-scraper.mjs`](scripts/fb-scraper.mjs) does the same
  end-to-end and inserts quests via a dedicated bot account:

  ```bash
  npm run scrape -- --dry-run     # classify & print, write nothing
  npm run scrape                  # post medium/high-confidence matches to the board
  npm run scrape -- --all         # include low-confidence matches too
  ```

  A private group needs a logged-in member's session to fetch live, so set
  `FB_COOKIE` (and `FB_GROUP` if the slug differs) for a real scrape; without it,
  the script falls back to a representative sample snapshot so it always runs.
  Only scrape groups you're a member of, and respect Facebook's Terms.

> Because SideQuest quests belong to a real account, imported quests are authored
> by you (in-app) or by an import bot (CLI), with the original Facebook poster
> credited in the description — you become the point of contact on the board.

## Roles

- **Quest Doer** — build a profile, add skills, browse & accept quests, chat, and climb the XP ranks.
- **Quest Poster** — post quests (with party size + bus tag), review and accept applicants, chat, and complete quests to release XP.

Auth, data, realtime, and access control are handled by **Supabase** (email/password auth + Postgres + Row Level Security + Realtime).

## Tech stack

- **Vite + React 18 + TypeScript**
- **Supabase** — auth, Postgres, RLS, Realtime (`@supabase/supabase-js`)
- **Tailwind CSS** — a red-and-white **Jersey palette** design system
- **Framer Motion** — transitions, animated filtering, the XP bar, toasts
- **lucide-react** — clean line icons

## Getting started

> **First time?** Run the one-time setup in [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)
> (paste one SQL file into the Supabase SQL editor + turn off email confirmation).
> ~2 minutes. The app is already connected via `.env`.

```bash
npm install
npm run dev      # http://localhost:5173
```

Build for production:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
├─ lib/
│  ├─ supabase.ts          # Supabase client
│  ├─ db.ts                # All data-access queries + RPC
│  ├─ types.ts             # Types mirroring the DB schema
│  ├─ constants.ts         # Parishes, categories, XP ranks, avatars
│  ├─ fbScraper.ts         # Facebook help-request detector → quest classifier
│  └─ sampleFeed.json      # Representative "Jersey Ask Advice" snapshot
├─ context/AuthContext.tsx # Session + role + sign in/up/out
├─ components/
│  ├─ Nav.tsx              # Role-aware nav + account menu
│  ├─ AuthScreen.tsx       # Sign up / log in with role selection
│  ├─ Landing.tsx          # Marketing hero (logged out)
│  ├─ QuestModal.tsx       # Quest detail + apply + Safe-Chat
│  ├─ Chat.tsx             # Realtime Safe-Chat
│  ├─ XPBar.tsx            # Jersey-red XP progress bar
│  ├─ Logo.tsx  Avatar.tsx  Toast.tsx
├─ pages/
│  ├─ QuestBoard.tsx       # Marketplace + Guild filters + apply
│  ├─ PostQuest.tsx        # Create a quest
│  ├─ FacebookImport.tsx   # Scan Jersey Ask Advice → draft & post quests
│  ├─ PosterManage.tsx     # Review applicants, complete, chat
│  └─ Profile.tsx          # XP profile + My Quests
└─ App.tsx                 # Auth-gated shell + routing

scripts/fb-scraper.mjs              # Headless scraper → posts quests via a bot
supabase/migrations/0001_init.sql   # Tables, triggers, RLS, RPC, realtime
```

---

Turn chores into quests. Made on the Rock.
