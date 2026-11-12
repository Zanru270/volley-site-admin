-- "A (really) great Location": lets the admin edit each building's
-- write-up on green, after the map, which used to be fixed in the
-- website's code.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.
--
-- Then run `npm run seed` in volley-site-admin once: it copies each
-- building's current paragraphs in, so the admin starts from what's
-- showing.

alter table public.locations add column if not exists area jsonb;
