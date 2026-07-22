# SideQuest — Build Specification

> **What it is:** A local marketplace for short jobs ("side quests") in Jersey, Channel Islands. People post small tasks (lawn mowing, shopping for the elderly, dog walking, moving help, odd jobs) that typically take 1–2 days. Other locals browse, apply, and get hired. Built for and by Jersey CI locals.
>
> **This document** is the complete build plan. It defines the stack, data model, features, screens, and phased milestones so an agent (or team) can implement the app end-to-end. Visual design / theming is deliberately **out of scope here** — it is handled in a separate design pass. Keep the UI structurally clean and modern; wire real components, not placeholders.

---

## 0. Core Concept & Rules

- **One account, two roles.** Every user can both *post* jobs (a "Poster") and *do* jobs (a "Quester"). No separate signup flows. Role is contextual per action, not a fixed account type.
- **Short jobs only.** Optimised for tasks lasting hours to ~2 days. Not a full employment platform.
- **Local-first.** Jersey CI only. Locations use Jersey parishes (the 12 parishes) as the primary geographic filter, not free-form global geocoding.
- **Trust matters.** Reviews, ratings, and profile completeness are first-class. A local community app lives or dies on trust.
- **Free tier constraints.** Everything must run within Supabase free tier and Cloudflare Pages free tier. No paid services required for v1.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 18 + Vite** | SPA. TypeScript. |
| Styling | **Tailwind CSS** | Utility-first. Design tokens added in the design pass. |
| Icons | **Lucide** (`lucide-react`) | Consistent icon set throughout. |
| Routing | **React Router v6** | Client-side routing. |
| Backend / DB | **Supabase (free tier)** | Postgres + Row Level Security. |
| Auth | **Supabase Auth** | Email/password + magic link. Optionally Google OAuth later. |
| File storage | **Supabase Storage** | Avatars + job photos. |
| Realtime | **Supabase Realtime** | Live chat messages + notification badges. |
| Hosting | **Cloudflare Pages** | Static build output (`dist/`). SPA fallback to `index.html`. |
| State | **React Query (TanStack Query)** | Server state, caching, optimistic updates. |
| Forms | **React Hook Form + Zod** | Validation shared with backend constraints. |

### Language & tooling
- TypeScript everywhere. Strict mode.
- ESLint + Prettier.
- Env vars via `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Never commit keys.

---

## 2. Repository Structure

```
sidequest/
├── public/
├── src/
│   ├── main.tsx                # App entry
│   ├── App.tsx                 # Router + providers
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client singleton
│   │   ├── queryClient.ts      # React Query config
│   │   └── constants.ts        # Parishes, categories, enums
│   ├── types/
│   │   └── database.ts         # Generated Supabase types + app types
│   ├── hooks/
│   │   ├── useAuth.ts          # Session + user profile
│   │   ├── useJobs.ts          # Job queries/mutations
│   │   ├── useApplications.ts
│   │   ├── useMessages.ts
│   │   └── useReviews.ts
│   ├── components/
│   │   ├── layout/             # Shell, Navbar, BottomNav, Footer
│   │   ├── ui/                 # Button, Input, Card, Badge, Modal, Avatar, etc.
│   │   ├── jobs/                # JobCard, JobList, JobFilters, JobForm
│   │   ├── applications/       # ApplicationCard, ApplyModal
│   │   ├── messages/           # ChatThread, MessageBubble, ThreadList
│   │   ├── reviews/            # ReviewCard, ReviewForm, StarRating
│   │   └── profile/            # ProfileHeader, ProfileStats
│   ├── pages/                  # Route-level components (see §5)
│   ├── context/                # AuthProvider, ToastProvider
│   └── utils/                  # formatters, date helpers, parish helpers
├── supabase/
│   ├── migrations/             # SQL schema migrations
│   └── seed.sql                # Categories, sample data (dev only)
├── .env.example
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## 3. Data Model (Supabase / Postgres)

All tables use `uuid` primary keys (`gen_random_uuid()`), `created_at timestamptz default now()`. RLS enabled on every table.

### 3.1 `profiles`
Extends `auth.users` (1:1). Row created on signup via trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `full_name` | text | Required |
| `avatar_url` | text | Supabase Storage path |
| `bio` | text | Short about |
| `parish` | text | One of the 12 Jersey parishes (enum-checked) |
| `phone` | text | Optional, private |
| `skills` | text[] | Tags: gardening, driving, tech help… |
| `is_verified` | boolean | Manual/email-verified flag |
| `rating_avg` | numeric | Denormalised, updated by trigger from reviews |
| `rating_count` | int | Denormalised |
| `jobs_posted_count` | int | Denormalised |
| `jobs_completed_count` | int | Denormalised |
| `created_at` | timestamptz | |

### 3.2 `jobs`
A posted side quest.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `poster_id` | uuid FK → profiles | Who posted it |
| `title` | text | Required, ≤ 80 chars |
| `description` | text | Required |
| `category` | text | FK/enum → job categories (§3.7) |
| `parish` | text | Jersey parish where job is |
| `location_detail` | text | Optional area/street hint (not full address until hired) |
| `budget_type` | enum | `fixed` \| `hourly` \| `negotiable` |
| `budget_amount` | numeric | GBP. Nullable if negotiable |
| `estimated_hours` | numeric | Optional |
| `date_needed` | date | When it needs doing |
| `is_flexible_date` | boolean | |
| `status` | enum | `open` \| `assigned` \| `in_progress` \| `completed` \| `cancelled` |
| `assigned_quester_id` | uuid FK → profiles | Null until hired |
| `photos` | text[] | Storage paths |
| `created_at` | timestamptz | |

### 3.3 `applications`
A Quester applying to a job.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `job_id` | uuid FK → jobs | |
| `quester_id` | uuid FK → profiles | |
| `message` | text | Pitch / note to poster |
| `proposed_amount` | numeric | Optional counter-offer |
| `status` | enum | `pending` \| `accepted` \| `rejected` \| `withdrawn` |
| `created_at` | timestamptz | |

Unique constraint: `(job_id, quester_id)` — one application per job per user.

### 3.4 `conversations`
Chat thread, scoped to a job + the two participants.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `job_id` | uuid FK → jobs | |
| `poster_id` | uuid FK → profiles | |
| `quester_id` | uuid FK → profiles | |
| `last_message_at` | timestamptz | For thread ordering |
| `created_at` | timestamptz | |

Unique: `(job_id, quester_id)`.

### 3.5 `messages`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `conversation_id` | uuid FK → conversations | |
| `sender_id` | uuid FK → profiles | |
| `body` | text | |
| `read_at` | timestamptz | Null = unread |
| `created_at` | timestamptz | |

### 3.6 `reviews`
Left after a job is completed. Both directions (poster→quester and quester→poster).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `job_id` | uuid FK → jobs | |
| `reviewer_id` | uuid FK → profiles | |
| `reviewee_id` | uuid FK → profiles | |
| `rating` | int | 1–5 |
| `comment` | text | |
| `created_at` | timestamptz | |

Unique: `(job_id, reviewer_id)` — one review per person per job.

### 3.7 `job_categories` (reference table / seed)
Seed rows, e.g.: `gardening`, `shopping-errands`, `cleaning`, `moving-help`, `pet-care`, `elderly-help`, `handyman`, `tech-help`, `childcare`, `delivery`, `tutoring`, `other`. Each has `slug`, `label`, `icon` (Lucide name).

### 3.8 `notifications` (optional v1.5)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | |
| `type` | enum | `new_application` \| `application_accepted` \| `new_message` \| `job_completed` \| `new_review` |
| `payload` | jsonb | Related IDs |
| `read_at` | timestamptz | |
| `created_at` | timestamptz | |

---

## 4. Row Level Security (RLS) Policies

Enforce authorisation at the DB level. Summary of intended rules:

- **`profiles`**: anyone authenticated can `SELECT` (public profiles); users can `UPDATE` only their own row. `phone` exposed only to the other party once a job is assigned (handle via a view or by only returning phone in hired context).
- **`jobs`**: authenticated users `SELECT` all `open` jobs; poster can `SELECT` own jobs in any status; assigned quester can `SELECT` their assigned jobs. Only poster can `INSERT`/`UPDATE`/`DELETE` own jobs. Status transitions validated (see §6).
- **`applications`**: quester can `INSERT` (not to own job); quester sees own applications; poster sees applications to their own jobs. Quester can `UPDATE` own to `withdrawn`; poster can `UPDATE` status to `accepted`/`rejected`.
- **`conversations` / `messages`**: only the two participants can `SELECT`/`INSERT`. `messages` insert allowed only if sender is a participant.
- **`reviews`**: `SELECT` public; `INSERT` only by a participant of a `completed` job, once, for the counterparty.

Denormalised counters (`rating_avg`, counts) updated via Postgres triggers/functions — never trusted from the client.

---

## 5. Screens & Routes

| Route | Page | Auth | Purpose |
|---|---|---|---|
| `/` | Landing / Home feed | Public (feed richer when logged in) | Hero + browse open jobs |
| `/login` | Login | Public | Email/password + magic link |
| `/signup` | Signup | Public | Create account → profile setup |
| `/onboarding` | Profile setup | Auth | Name, parish, avatar, skills |
| `/jobs` | Browse jobs | Public | Filterable/searchable job list |
| `/jobs/:id` | Job detail | Public (apply needs auth) | Full job, poster info, apply button |
| `/jobs/new` | Post a job | Auth | Create job form |
| `/jobs/:id/edit` | Edit job | Auth (owner) | Edit while `open` |
| `/dashboard` | Dashboard | Auth | Tabbed: "My Posted Jobs" + "My Applications" |
| `/dashboard/posted` | Posted jobs | Auth | Manage jobs, review applicants |
| `/dashboard/applications` | My applications | Auth | Track application statuses |
| `/messages` | Inbox | Auth | Conversation list |
| `/messages/:conversationId` | Chat thread | Auth | Realtime chat |
| `/profile/:id` | Public profile | Public | Bio, ratings, reviews, completed jobs |
| `/profile/edit` | Edit own profile | Auth | Update details |
| `/notifications` | Notifications | Auth | (v1.5) activity feed |
| `*` | 404 | Public | Not found |

### Navigation
- **Desktop:** top navbar — logo, Browse, Post a Job (primary), Messages (badge), avatar menu (Dashboard, Profile, Logout).
- **Mobile:** bottom tab bar — Home, Browse, Post (center FAB), Messages, Profile.

---

## 6. Core Flows

### 6.1 Signup → Onboarding
1. Signup (email/password or magic link).
2. DB trigger creates empty `profiles` row.
3. Redirect to `/onboarding`: collect `full_name`, `parish`, avatar (optional), `skills`. Mark profile "complete".
4. Land on home feed.

### 6.2 Posting a job
1. `/jobs/new` form (title, description, category, parish, budget type/amount, date, photos).
2. Zod validation → insert `jobs` row (`status = open`).
3. Redirect to job detail. Poster can edit/cancel while `open`.

### 6.3 Applying to a job
1. Quester on `/jobs/:id` taps **Apply** (auth required; can't apply to own job).
2. ApplyModal: message + optional `proposed_amount`.
3. Insert `applications` (`status = pending`). Notify poster.
4. Creates/opens a `conversation` for that job+quester so they can chat.

### 6.4 Hiring
1. Poster reviews applicants on `/dashboard/posted` → job → applicants list.
2. Accept one → application `accepted`, others auto-`rejected`, job `status = assigned`, `assigned_quester_id` set.
3. Full contact/location detail now revealed to the hired quester. Notify quester.

### 6.5 Doing the job & completion
1. Job `assigned` → poster or quester marks `in_progress` (optional).
2. On finish, poster marks `completed`. Bump `jobs_completed_count`.
3. Both parties prompted to leave a **review** (§6.6).

### 6.6 Reviews
1. After `completed`, each party can submit one review (1–5 + comment) for the other.
2. Trigger recomputes `rating_avg` / `rating_count` on the reviewee's profile.
3. Reviews shown on public profiles.

### 6.7 Messaging
- Realtime via Supabase Realtime subscription on `messages` filtered by `conversation_id`.
- Inbox ordered by `last_message_at`. Unread badge from `read_at IS NULL`.
- Mark read on thread open.

### Status transition rules (jobs)
`open → assigned → in_progress → completed`. `open`/`assigned` → `cancelled` allowed by poster. No backward transitions. Enforce in a Postgres function + guard in UI.

---

## 7. Key Components (build these)

- **JobCard** — title, category badge, parish, budget, date, poster avatar+rating, status pill.
- **JobFilters** — search text, category multiselect, parish select, budget range, sort (newest / date needed / budget).
- **JobForm** — create/edit, photo upload to Supabase Storage, Zod-validated.
- **ApplyModal** — message + proposed amount.
- **ApplicationCard** — applicant profile summary, message, accept/reject actions (poster view) or status (quester view).
- **ChatThread** — realtime messages, composer, read receipts.
- **ThreadList** — inbox rows with last message preview + unread badge.
- **StarRating** — read + input variants.
- **ReviewCard / ReviewForm**.
- **ProfileHeader / ProfileStats** — avatar, name, parish, rating, jobs completed.
- **ParishSelect** — dropdown of the 12 Jersey parishes.
- **UI primitives** — Button, Input, Textarea, Select, Card, Badge, Modal/Dialog, Avatar, Toast, Skeleton, EmptyState, Spinner.

### Constants to define (`lib/constants.ts`)
- **Jersey parishes (12):** St Helier, St Saviour, St Clement, Grouville, St Martin, Trinity, St John, St Mary, St Ouen, St Peter, St Brelade, St Lawrence.
- **Categories** (§3.7) with Lucide icon per category.
- **Budget types**, **job statuses**, **application statuses** enums.

---

## 8. Non-Functional Requirements

- **Auth guard**: protected routes redirect unauthenticated users to `/login` with return-to.
- **Loading/empty/error states** for every data view (skeletons + EmptyState + retry).
- **Optimistic updates** for apply, send message, accept/reject via React Query.
- **Accessibility**: semantic HTML, focus management in modals, keyboard nav, aria labels on icon buttons, colour-contrast (validated in design pass).
- **Responsive**: mobile-first; bottom nav on mobile, top nav on desktop.
- **Performance**: route-level code splitting, image lazy-loading, paginated/infinite job list.
- **Security**: all authz in RLS (never trust client); anon key only; validate inputs both client (Zod) and DB (constraints).
- **PWA (nice-to-have)**: installable, offline shell.

---

## 9. Milestones / Phased Build

### Phase 0 — Scaffold
- [ ] Vite + React + TS project, Tailwind, Lucide, React Router, React Query installed.
- [ ] Supabase project created; client singleton; `.env.example`.
- [ ] App shell: navbar, mobile bottom nav, route skeleton, 404.

### Phase 1 — Auth & Profiles
- [ ] Signup / login (email/password + magic link).
- [ ] `profiles` table + signup trigger + RLS.
- [ ] Onboarding flow.
- [ ] Public profile page + edit profile + avatar upload.

### Phase 2 — Jobs core
- [ ] `jobs` table + RLS + status enum.
- [ ] Post a job (form + photo upload).
- [ ] Browse jobs (list + filters + search + pagination).
- [ ] Job detail page.
- [ ] Edit/cancel own job.

### Phase 3 — Applications & Hiring
- [ ] `applications` table + RLS + unique constraint.
- [ ] Apply flow (modal).
- [ ] Dashboard: posted jobs + applicants management.
- [ ] Dashboard: my applications tracking.
- [ ] Hire flow (accept → assign, auto-reject others, reveal contact).

### Phase 4 — Messaging
- [ ] `conversations` + `messages` tables + RLS.
- [ ] Realtime chat thread.
- [ ] Inbox with unread badges + read receipts.

### Phase 5 — Completion & Reviews
- [ ] Job completion flow + counters.
- [ ] `reviews` table + RLS + rating triggers.
- [ ] Review forms + display on profiles.

### Phase 6 — Polish & Ship
- [ ] Notifications (in-app).
- [ ] Empty/loading/error states audit.
- [ ] Accessibility + responsive pass.
- [ ] Design system applied (separate design pass).
- [ ] Cloudflare Pages deploy + SPA fallback + env vars.
- [ ] Seed data cleanup; production RLS review.

---

## 10. Deployment (Cloudflare Pages)

- Build command: `npm run build` → output `dist/`.
- SPA fallback: add `public/_redirects` with `/*  /index.html  200`.
- Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) set in Pages dashboard.
- Supabase: add the Pages domain to allowed redirect URLs (auth) and CORS.

---

## 11. Out of Scope (v1)

- Payments / escrow (jobs settled offline between locals).
- Native mobile apps (web/PWA only).
- Global geography (Jersey parishes only).
- Admin moderation dashboard (manual via Supabase for now).
- Full design system / theming — **handled in the separate design pass.**

---

## 12. Open Questions (decide before/with design pass)

- Verification: email-only, or add phone/ID for trust?
- Should posters see applicant contact before hiring, or only after? (Spec assumes after.)
- Dispute handling for no-shows — flag/report mechanism in v1 or later?
- Guest browsing depth — how much visible before signup wall?
