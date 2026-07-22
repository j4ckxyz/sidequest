# SideQuest — demo accounts

Run the seeder once to create every account below, a full board of quests, and
some applications:

```bash
npm run seed
```

Prerequisites (see `SUPABASE_SETUP.md`): the migration must be applied, and
**"Confirm email" should be OFF** (Auth → Providers → Email).

**Password for every account:** `Quest1234!`

There is **one account type** — every account can both post quests and complete
them.

| Name | Email | Parish | XP / rank |
|------|-------|--------|-----------|
| Margaret Le Brun | `margaret@sidequest.je` | St Helier | 260 · Apprentice Helper |
| The Green Thumb Café | `greenthumb@sidequest.je` | St Brelade | 0 · Novice Adventurer |
| David Ozouf | `david@sidequest.je` | St Ouen | 120 · Novice Adventurer |
| Trinity Riding Stables | `trinity@sidequest.je` | Trinity | 0 · Novice Adventurer |
| Sophie Gruchy | `sophie@sidequest.je` | St Saviour | 60 · Novice Adventurer |
| La Rocque Hardware | `larocque@sidequest.je` | Grouville | 0 · Novice Adventurer |
| Charlie Renouf | `charlie@sidequest.je` | St Helier | 40 · Novice Adventurer |
| Amélie Bisson | `amelie@sidequest.je` | St Saviour | 180 · Apprentice Helper |
| Tom Le Feuvre | `tom@sidequest.je` | St Brelade | 520 · Island Explorer |
| Priya Gallichan | `priya@sidequest.je` | St Clement | 90 · Novice Adventurer |
| Ollie de la Haye | `ollie@sidequest.je` | St Ouen | 900 · Parish Hero |
| Marcus Vautier | `marcus@sidequest.je` | Grouville | 1600 · Local Legend |

## What gets created

- **16 quests** across St Helier, St Brelade, St Ouen, Trinity, St Saviour and
  Grouville — a mix of single-time and weekly, gardening, pets, tech help,
  tutoring, cleaning, moving, events and errands, rewards from £5 to £30, with
  several **Quest Parties** (party size 2–3).
- **Applications** are pre-submitted, so logging in as a quest owner (e.g.
  `margaret@sidequest.je`) gives you applicants to accept and Safe-Chat threads
  to try under **My Quests**.

To reset everything, re-run the migration (it drops & recreates the tables),
then `npm run seed` again.
