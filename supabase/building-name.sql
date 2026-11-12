-- A building's name: lets the admin rename a building (shown on the
-- website as "Volley <name>": its page, its card, the lists), which used to
-- be fixed in the website's code. Empty keeps the website's own name.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.locations add column if not exists name text;
