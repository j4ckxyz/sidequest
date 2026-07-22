# SideQuest

**Turn community chores into completed quests.** Earn money, help neighbours, and conquer the Rock.

SideQuest is a gamified local-jobs marketplace for Jersey. Residents and small businesses (**Quest Posters**) list single-time or weekly tasks; local teens and students (**Quest Doers**) grab them, team up in parties, chat safely, and level up with XP. Real accounts, real quests, live chat — backed by Supabase.

## Feature ecosystem

1. **Two-sided accounts & XP system** — Doers get a gamified profile with a Jersey-red **XP progress bar**, earning XP on every completed quest and ranking up from *Novice Adventurer* to *Local Legend*. Posters manage listings, review applicants, carry a **Community Verified** badge, and release payment + XP on completion.
2. **The Quest Board (Guilds)** — A live marketplace organised by Jersey's 12 **parish Guilds**. Filter **Single-time** vs **Weekly** quests and spot **Bus-Route-Friendly** tasks for non-drivers.
3. **Quest Party (group gigs)** — Posters set a **party size** for bigger jobs; doers fill the open slots and the reward splits equally.
4. **Safe-Chat (Supabase Realtime)** — Live messaging attached to each quest so posters and doers coordinate without swapping phone numbers.

Everything starts **empty** — no seed data. You see exactly what a real first user sees.

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
│  └─ constants.ts         # Parishes, categories, XP ranks, avatars
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
│  ├─ DoerDashboard.tsx    # XP profile + My Adventures
│  ├─ PostQuest.tsx        # Create a quest
│  └─ PosterManage.tsx     # Review applicants, complete, chat
└─ App.tsx                 # Auth-gated shell + routing

supabase/migrations/0001_init.sql   # Tables, triggers, RLS, RPC, realtime
```

---

Turn chores into quests. Made on the Rock.
