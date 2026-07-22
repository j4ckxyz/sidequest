# JèrriConnect

**Flipping the script on the Jersey brain drain.** Your bridge from UK universities back to the Rock.

JèrriConnect is a *reverse* talent marketplace: instead of students chasing jobs, Jersey employers discover and headhunt island talent studying across the UK — before they even graduate. This repo is a polished, interactive prototype built for a 24/48-hour hackathon.

<p align="center">
  <em>Landing · Employer reverse-search · Student dashboard · Holiday Hub &amp; Chapters map</em>
</p>

## What's inside

Four features, one seamless journey:

1. **Reverse Talent Marketplace & Portfolio Showcase** — Employers search *students*. Each profile surfaces real proof of work: dissertations, GitHub repos, design portfolios. Live search + field/year filters, a rich profile modal, and a "Request interview" flow.
2. **Bursary & Undergraduate Scheme Aggregator** — A "Matchmaker" on the student dashboard: pick your degree field and instantly see every Jersey bursary and undergraduate scheme you qualify for (Government of Jersey, Mourant, Digital Jersey, Jersey Finance, Jersey Electricity).
3. **Holiday Hub** — A job board dedicated to short-term, break-timed opportunities: 1-day shadowing, 2-week agile sprints and reading-week insights. Filter by break type and field.
4. **Jersey Chapters** — A UK map showing where Jersey students cluster ("23 in London, 15 in Bristol") so firms host pop-ups exactly where the talent is, plus mentors offering digital coffee-chats.

## Tech stack

- **Vite + React 18 + TypeScript** — fast, typed, modern.
- **Tailwind CSS** — a custom Apple-inspired design system (glassmorphism, SF-style type, soft shadows).
- **Framer Motion** — fluid page transitions, animated filtering, spring-loaded toasts.
- **lucide-react** — clean line icons.
- All content is driven by a single, richly-populated `src/data/mockData.ts` — no backend required.

## Getting started

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

1. **Land** on the hero → hit **"I'm hiring in Jersey."**
2. In the **Employer portal**, type `Finance` (or `Rust`, `tidal energy`, `Bristol`) and watch the list filter in real time. Toggle the field chips.
3. Click a student → the **profile modal** opens with their uploaded university work → hit **Request interview** to trigger the confirmation toast.
4. Switch to **For Students** → change your degree field and watch the **Bursary Matchmaker** re-filter live. Upload a dissertation summary.
5. Open the **Holiday Hub** → browse break-timed shadowing slots, then explore the **Jersey Chapters** map of UK student clusters.

## Project structure

```
src/
├─ data/mockData.ts        # Students, bursaries, internships, mentors, chapters
├─ components/
│  ├─ Nav.tsx              # Glass segmented nav
│  ├─ Landing.tsx          # Marketing hero + feature pillars
│  ├─ StudentModal.tsx     # Full profile + portfolio showcase
│  ├─ Avatar.tsx
│  └─ Toast.tsx            # Apple-style confirmation toasts
├─ pages/
│  ├─ StudentDashboard.tsx # Profile + Bursary Matchmaker
│  ├─ EmployerPortal.tsx   # Reverse search + live filtering
│  └─ HolidayHub.tsx       # Holiday Hub + Chapters map
└─ App.tsx                 # Shell, routing, transitions
```

---

Built on the Rock. Bringing Jersey's talent home.
