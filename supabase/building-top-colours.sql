-- A building's own top of the page: the announcement banner along the top
-- (its colour, and its own wording and link or the home page's), the
-- background colour of the slideshow section, and its title's colour.
-- Empty keeps the home page's banner and the website's pink and red.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the columns
-- if they're missing.

alter table public.locations add column if not exists banner jsonb;
alter table public.locations add column if not exists hero_colour text;
alter table public.locations add column if not exists hero_title_colour text;
