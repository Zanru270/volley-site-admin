-- Volley Reader dates: gives each article a real date, so the articles
-- show newest first (in the admin and on the website), as the Bow + Arc
-- CMS's News & Views does.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing, and only fills in articles that have no date yet.
--
-- schema.sql already has the column for new projects. The update fills
-- each date in from the article's byline where that reads like a date
-- ("July 15, 2024"); any other byline (a name, say) is left for the date
-- to be set in the admin.

alter table public.articles add column if not exists date date;

update public.articles
set date = to_date(meta, 'FMMonth FMDD, YYYY')
where date is null
  and meta ~ '^(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}, [0-9]{4}$';
