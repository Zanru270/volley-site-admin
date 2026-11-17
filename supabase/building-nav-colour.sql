-- The colour of the menu bar along the top of a building's page while it's
-- closed: the Volley logo, the line under it, the building's name beside
-- it and the menu button (a hex colour). Empty keeps the website's ink.
-- Open, the menu keeps its own colours.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.locations add column if not exists nav_colour text;
