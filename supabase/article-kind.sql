-- Whether an article is in the Volley Reader or Goings on (the events):
-- its carousel on the home page, its address on the website
-- (/volley-reader/… or /goings-on/…), and its tab on the admin's Articles
-- page. Every article already written stays in the Reader.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.

alter table public.articles add column if not exists kind text not null default 'reader';
