-- For buildings added in the admin (the "New building" button): the city
-- under its name at the top of its page and beside it in the menu, and
-- the colour of its closing sections and footer. Empty keeps what the
-- website's code has (lib/locations.js), for the buildings it has.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the columns
-- if they're missing.

alter table public.locations add column if not exists city text;
alter table public.locations add column if not exists footer text;
