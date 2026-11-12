-- "What's included": lets the admin edit each building's "See what is
-- (included) in my rental" section (its paragraph, its lists and their
-- icons), which used to be fixed in the website's code.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.
--
-- Then run `npm run seed` in volley-site-admin once: it copies Volley
-- Brooklyn's current list in, so the admin starts from what's showing. The
-- other buildings have none, so theirs stays hidden until one is added.

alter table public.locations add column if not exists included jsonb;
