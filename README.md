# JèrriConnect

**Flipping the script on the Jersey brain drain.** Your bridge from UK universities back to the Rock.

JèrriConnect is a *reverse* talent marketplace: instead of students chasing jobs, Jersey employers discover and headhunt island talent studying across the UK — before they even graduate. Real accounts, real profiles, real postings — backed by Supabase.

## What's inside

Four features, one seamless journey — with real sign-up for both sides:

1. **Reverse Talent Marketplace & Portfolio Showcase** — Employers search *students*. Each profile surfaces real proof of work: dissertations, GitHub repos, design portfolios. Live search + field/year filters, a rich profile modal, and a persisted "Request interview" flow.
2. **Bursary & Undergraduate Scheme Aggregator** — A "Matchmaker" on the student dashboard: set your degree field and instantly see every bursary you qualify for. Bursaries are posted by employer accounts.
3. **Holiday Hub** — Short, break-timed opportunities (1-day shadowing, 2-week agile sprints, reading-week insights) posted by employers; students filter and apply.
4. **Jersey Chapters** — A UK map that fills in from real student locations, showing firms exactly where Jersey talent clusters.

Everything starts **empty** — no seed data. You see precisely what a real first user sees.

## Accounts & roles

- **Students** sign up, build a profile, add portfolio projects, toggle discoverability, match bursaries, and apply to opportunities.
- **Employers** sign up, search discoverable students, request interviews, and post opportunities + bursaries.

Auth, data, and access control are handled by **Supabase** (email/password auth + Postgres + Row Level Security).

## Tech stack

- **Vite + React 18 + TypeScript**
- **Supabase** — auth, Postgres, and RLS (`@supabase/supabase-js`)
- **Tailwind CSS** — a custom Apple-inspired design system (glassmorphism, SF-style type, soft shadows)
- **Framer Motion** — page transitions, animated filtering, spring-loaded toasts
- **lucide-react** — clean line icons

## Getting started

> **First time?** Run the one-time database setup in [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)
> (paste one SQL file into the Supabase SQL editor + turn off email confirmation).
> Takes ~2 minutes. The app is already connected via `.env`.

```bash
npm install
npm run dev      # http://localhost:5173
```

Build for production:

```bash
npm run build
npm run preview
```

## The demo journey

1. **Land** on the hero → **Hire in Jersey** → create an employer account.
2. In **Post & Manage**, publish a Holiday Hub opportunity and a bursary.
3. Sign out, **Join as a student** in another browser → build your profile, add a project, and watch the **Bursary Matchmaker** surface the employer's bursary for your field.
4. Apply to the opportunity in the **Holiday Hub**; your UK city appears on the **Chapters** map.
5. Back as the employer → **Find Talent** → search, open the student's portfolio → **Request interview**. The student sees it on their dashboard.

## Project structure

```
src/
├─ lib/
│  ├─ supabase.ts          # Supabase client
│  ├─ db.ts                # All data-access queries
│  ├─ types.ts             # Types mirroring the DB schema
│  ├─ constants.ts         # Fields, gradients, helpers
│  └─ cities.ts            # UK city coordinates for the Chapters map
├─ context/AuthContext.tsx # Session + role + sign in/up/out
├─ components/
│  ├─ Nav.tsx              # Role-aware glass nav + account menu
│  ├─ AuthScreen.tsx       # Sign in / sign up with role selection
│  ├─ Landing.tsx          # Marketing hero (logged out)
│  ├─ StudentModal.tsx     # Profile + portfolio showcase
│  ├─ Avatar.tsx
│  └─ Toast.tsx            # Apple-style confirmation toasts
├─ pages/
│  ├─ StudentDashboard.tsx # Profile editor + projects + Matchmaker
│  ├─ EmployerPortal.tsx   # Reverse search + interview requests
│  ├─ EmployerPost.tsx     # Post & manage opportunities + bursaries
│  └─ HolidayHub.tsx       # Opportunities + live Chapters map
└─ App.tsx                 # Auth-gated shell + routing

supabase/migrations/0001_init.sql   # Tables, trigger, RLS
```

---

Built on the Rock. Bringing Jersey's talent home.
