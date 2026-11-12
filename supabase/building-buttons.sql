-- Whether a building page shows its intro's two buttons, "Download price
-- list and floor plans" and "Watch the official tour here":
-- { "pricelist": false } hides that one. Empty shows both. And the tour
-- button's link (empty keeps the website's own).
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.locations add column if not exists buttons jsonb;
alter table public.locations add column if not exists tour text;
