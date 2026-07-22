# Supabase setup (one-time, ~2 minutes)

The app is already wired to your project (`zqkxmpqsgkqxwkmzzfja`) via `.env`. You
just need to create the tables and relax email confirmation so accounts work
instantly.

## 1. Run the migration

1. Open the **SQL Editor**:
   https://supabase.com/dashboard/project/zqkxmpqsgkqxwkmzzfja/sql/new
2. Copy the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Paste it into the editor and click **Run**.

This creates the SideQuest tables (`profiles`, `doers`, `posters`, `quests`,
`applications`, `messages`), a trigger that provisions a profile when someone
signs up, triggers that keep applicant/party counts in sync, a
`complete_quest()` function that awards XP, Row Level Security policies, and
enables **Realtime** on the `messages` table for Safe-Chat.

> The script starts by dropping the app's tables, so it's safe to re-run and it
> also clears the old JèrriConnect tables if they were ever created.

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

Create a **Quest Poster** account and a **Quest Doer** account (use two
different emails, or two browsers) to see both sides. Everything starts empty —
exactly what a real first user sees.

### A good demo loop

1. As a **Poster** → *Post a Quest* → publish a lawn-mowing quest (set a party
   size for a group gig).
2. As a **Doer** (other browser) → *Quest Board* → filter by parish / Bus
   Friendly → open the quest → **Accept quest**.
3. Either side → open **Safe-Chat** on that quest → messages appear live for the
   other side (Supabase Realtime).
4. As the **Poster** → *My Quests* → **Accept** the applicant → **Complete &
   release XP**.
5. As the **Doer** → *My Adventures* → watch your **XP bar** climb toward the
   next rank.

## Notes

- The **anon key** in `.env` is a *publishable* key. It's designed to live in
  the browser; access is enforced by the RLS policies in the migration.
- XP can only be granted through the `complete_quest()` function (called by the
  quest's poster), never written directly from the browser.
- To wipe all data and start fresh, just re-run the migration.
