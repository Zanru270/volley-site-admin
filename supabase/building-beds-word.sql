-- The word beside the bed count on a building's sticker: "140 amazing
-- bedrooms available" ("design-led", say). Empty keeps "amazing".
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.locations add column if not exists beds_word text;
