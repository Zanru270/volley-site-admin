-- Building order: lets the admin's Buildings page set the order of the
-- website's Locations carousel.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing, and only fills in buildings that have no order yet.
--
-- schema.sql already has the column for new projects; this file also sets
-- the starting order to the one the website uses today (Brooklyn, Baileys,
-- Roper, Mooiriver), so nothing moves until it's changed in the admin.

alter table public.locations add column if not exists sort integer;

update public.locations
set sort = case slug
  when 'brooklyn' then 0
  when 'baileys' then 1
  when 'roper' then 2
  when 'mooiriver' then 3
end
where sort is null;
