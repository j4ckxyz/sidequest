# SideQuest — demo accounts

Run the seeder once to create every account below plus a full board of quests
and some applications:

```bash
npm run seed
```

Prerequisites (see `SUPABASE_SETUP.md`): the migration must be applied, and
**"Confirm email" should be OFF** (Auth → Providers → Email) so these accounts
are usable straight away.

**Password for every account:** `Quest1234!`

## Quest Posters (residents & businesses)

| Name | Email | Type | Parish | Verified |
|------|-------|------|--------|----------|
| Margaret Le Brun | `margaret.poster@sidequest.je` | Resident | St Helier | ✓ |
| The Green Thumb Café | `greenthumb.poster@sidequest.je` | Business | St Brelade | ✓ |
| David Ozouf | `david.poster@sidequest.je` | Resident | St Ouen | — |
| Trinity Riding Stables | `trinity.poster@sidequest.je` | Business | Trinity | ✓ |
| Sophie Gruchy | `sophie.poster@sidequest.je` | Resident | St Saviour | — |
| La Rocque Hardware | `larocque.poster@sidequest.je` | Business | Grouville | ✓ |
| Peter Vibert | `peter.poster@sidequest.je` | Resident | St Martin | — |
| St Peter Community Hall | `stpeterhall.poster@sidequest.je` | Business | St Peter | ✓ |

## Quest Doers (teens & students)

| Name | Email | Parish | XP / rank |
|------|-------|--------|-----------|
| Charlie Renouf | `charlie.doer@sidequest.je` | St Helier | 40 · Novice Adventurer |
| Amélie Bisson | `amelie.doer@sidequest.je` | St Saviour | 180 · Apprentice Helper |
| Tom Le Feuvre | `tom.doer@sidequest.je` | St Brelade | 520 · Island Explorer |
| Priya Gallichan | `priya.doer@sidequest.je` | St Clement | 90 · Novice Adventurer |
| Ollie de la Haye | `ollie.doer@sidequest.je` | St Ouen | 900 · Parish Hero |
| Hana Ahier | `hana.doer@sidequest.je` | Trinity | 300 · Apprentice Helper |
| Marcus Vautier | `marcus.doer@sidequest.je` | Grouville | 1600 · Local Legend |
| Isla Journeaux | `isla.doer@sidequest.je` | St Martin | 60 · Novice Adventurer |
| Ben Syvret | `ben.doer@sidequest.je` | St Peter | 240 · Apprentice Helper |
| Freya Mourant | `freya.doer@sidequest.je` | St Lawrence | 420 · Island Explorer |

## What gets created

- **18 quests** across St Helier, St Brelade, St Ouen, Trinity, St Saviour,
  Grouville, St Martin and St Peter — a mix of single-time and weekly, gardening,
  pets, tech help, tutoring, cleaning, moving, events and errands, with rewards
  from £5 to £45, several **Quest Parties** (party size 2–4), and many tagged
  **Bus-route friendly**.
- **Applications** are pre-submitted, so when you log in as a poster you'll have
  applicants to accept and Safe-Chat threads to try.

To reset everything, re-run the migration (it truncates and recreates the
tables), then `npm run seed` again.
