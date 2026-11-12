-- Which sections of a building's page are switched off, from the Form
-- view's "Sections" switches: { "map": false } hides the map. Empty shows
-- every section (each still needs something in it to show).
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.locations add column if not exists sections jsonb;
