-- Building photos: lets the admin's Buildings page change every photo on a
-- building's page and card (the slideshow, the photo bands, the map, the
-- gallery and the rest), which used to be fixed in the website's code.
--
-- Run once, in an existing project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: it only adds the column
-- if it's missing.
--
-- Then run `npm run seed` in volley-site-admin once: it copies each
-- building's current photos in from the website, so the admin starts from
-- exactly what's showing. Until then (and for any photo not set) the
-- website keeps its own.

alter table public.locations add column if not exists photos jsonb;
