# Supabase setup (one-time, ~2 minutes)

The app is already wired to your project (`zqkxmpqsgkqxwkmzzfja`) via `.env`. You
just need to create the tables and relax email confirmation so accounts work
instantly.

## 1. Run the migration

1. Open the **SQL Editor**:
   https://supabase.com/dashboard/project/zqkxmpqsgkqxwkmzzfja/sql/new
2. Copy the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Paste it into the editor and click **Run**.

This creates the SideQuest tables (`profiles`, `quests`, `applications`,
`messages`, `week_logs`), a trigger that provisions a profile when someone signs
up, triggers that keep applicant/party counts in sync, the `complete_quest()`,
`log_week()` and `unlog_week()` XP functions, Row Level Security policies, and
enables **Realtime** on the `messages` table for Safe-Chat.

> There is one unified account — every account can post quests and complete
> them. The script drops & recreates the app's tables, so it's safe to re-run
> (and it clears any tables from earlier iterations). **Re-run it now** if you
> set the project up before this update — the schema changed.

## 2. Turn off email confirmation (recommended for the demo)

So new users land straight in the app:

1. Open **Authentication → Sign In / Providers → Email**:
   https://supabase.com/dashboard/project/zqkxmpqsgkqxwkmzzfja/auth/providers
2. Turn **"Confirm email"** off and save.

(If you leave it on, the app still works — new users just see a "check your
inbox" screen and must click the confirmation link before logging in.)

## 3. Run the app

```bash
npm install
npm run dev
```

Create an account (one type — everyone can post and do). Use two accounts / two
browsers to see both sides of a quest. Or run `npm run seed` (see
`DEMO_ACCOUNTS.md`) to populate a full board.

### A good demo loop

1. Account A → *Post a Quest* → publish a lawn-mowing quest (set a party size for
   a group gig).
2. Account B (other browser) → *Quest Board* → filter by parish, type, job type
   or pay → open the quest → **Accept quest**.
3. Either side → open **Safe-Chat** on that quest → messages appear live for the
   other side (Supabase Realtime).
4. Account A → *My Quests* → open the quest → **Accept** the applicant →
   **Complete & release XP** (single-time), or tick weeks on the **calendar**
   (weekly).
5. Account B → *Profile* → watch your **XP bar** climb toward the next rank.

## Notes

- The **anon key** in `.env` is a *publishable* key. It's designed to live in
  the browser; access is enforced by the RLS policies in the migration.
- XP can only be granted through the `complete_quest()` function (called by the
  quest's poster), never written directly from the browser.
- To wipe all data and start fresh, just re-run the migration.
