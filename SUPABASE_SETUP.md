# Supabase setup (one-time, ~2 minutes)

The app is already wired to your project (`zqkxmpqsgkqxwkmzzfja`) via `.env`. You
just need to create the tables and relax email confirmation so accounts work
instantly.

## 1. Run the migration

1. Open the **SQL Editor**:
   https://supabase.com/dashboard/project/zqkxmpqsgkqxwkmzzfja/sql/new
2. Copy the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Paste it into the editor and click **Run**.

This creates the tables (`profiles`, `students`, `projects`, `employers`,
`opportunities`, `bursaries`, `interview_requests`, `applications`), a trigger
that provisions a profile whenever someone signs up, and Row Level Security
policies so the public anon key is safe to ship in the browser.

## 2. Turn off email confirmation (recommended for the demo)

So judges can create an account and land straight in the app:

1. Open **Authentication → Sign In / Providers → Email**:
   https://supabase.com/dashboard/project/zqkxmpqsgkqxwkmzzfja/auth/providers
2. Turn **"Confirm email"** off and save.

(If you leave it on, the app still works — new users just see a "check your
inbox" screen and must click the confirmation link before signing in.)

## 3. Run the app

```bash
npm install
npm run dev
```

Create a student account and an employer account (use two different emails, or
two browsers) to see both sides of the marketplace. Everything starts empty —
exactly what a real first user sees.

## Notes

- The **anon key** in `.env` is a *publishable* key. It's designed to live in
  the browser; access is enforced by the RLS policies in the migration. The
  service-role key is never used by this app and should never be committed.
- To wipe all data and start fresh, run this in the SQL editor:
  ```sql
  truncate public.applications, public.interview_requests, public.projects,
           public.opportunities, public.bursaries,
           public.students, public.employers, public.profiles cascade;
  -- then delete the users under Authentication → Users
  ```
