-- A building's bed count: the number on the "amazing bedrooms available"
-- sticker on its page's photos, and on its card. It used to be fixed in the
-- website's code. Empty keeps the website's own number.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.locations add column if not exists beds integer;
