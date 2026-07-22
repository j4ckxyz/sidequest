-- Dev-only seed data. Safe to re-run (upserts on conflict).
-- Sample profiles/jobs are NOT seeded here: profiles.id is a foreign key into
-- auth.users, and auth.users rows need real Supabase Auth signups (password
-- hashing, email confirmation state, etc.) rather than a raw INSERT. Sign up
-- a few test accounts through the app itself instead — see src/lib/mockDb.ts
-- for fixture data you can use as inspiration for realistic dev content.

insert into public.job_categories (slug, label, icon) values
  ('gardening', 'Gardening', 'Sprout'),
  ('shopping-errands', 'Shopping & Errands', 'ShoppingBasket'),
  ('cleaning', 'Cleaning', 'Sparkles'),
  ('moving-help', 'Moving Help', 'Truck'),
  ('pet-care', 'Pet Care', 'PawPrint'),
  ('elderly-help', 'Elderly Help', 'HeartHandshake'),
  ('handyman', 'Handyman', 'Wrench'),
  ('tech-help', 'Tech Help', 'Laptop'),
  ('childcare', 'Childcare', 'Baby'),
  ('delivery', 'Delivery', 'Package'),
  ('tutoring', 'Tutoring', 'GraduationCap'),
  ('other', 'Other', 'MoreHorizontal')
on conflict (slug) do update set label = excluded.label, icon = excluded.icon;
