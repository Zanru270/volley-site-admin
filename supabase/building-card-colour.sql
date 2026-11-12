-- The colour of a building's name over the photo on its card, picked in
-- the admin's card details (a hex colour, e.g. #F6EB6D). Empty keeps the
-- website's own for that building.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.locations add column if not exists card_colour text;
