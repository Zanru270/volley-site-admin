-- Whether a building is on the website, picked at the top of its editor:
-- 'live' (its card links to its page), 'card' (its card shows but doesn't
-- link, and its page says it's not open yet) or 'draft' (no card, and the
-- same page). Empty is live.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.locations add column if not exists visibility text;
