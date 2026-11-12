-- Volley website: tables, security rules, functions and file storage.
--
-- Run once, in a new Supabase project: Supabase > SQL Editor > New query,
-- paste this whole file, Run. Safe to run again: everything is
-- "if not exists" / "or replace".
--
-- Who can do what:
--   anon (the public website, no login)
--     reads content (settings, FAQs, locations, published articles)
--   admins (a Supabase Auth login whose email is in admin_users)
--     everything else: edit content, upload files
--
-- Tour bookings and waitlist sign-ups aren't here: the website saves them
-- to the Volley app's project (Volley-App/supabase/migrations/015_…).
--
-- Anyone else who manages to sign in gets nothing beyond what anon gets.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  email text primary key,
  name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- True when the signed-in user's email is on the allow-list. Security
-- definer, so policies can call it without being able to read the table.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "Admins read admins" on public.admin_users;
create policy "Admins read admins" on public.admin_users
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins add admins" on public.admin_users;
create policy "Admins add admins" on public.admin_users
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins remove admins" on public.admin_users;
create policy "Admins remove admins" on public.admin_users
  for delete to authenticated using (public.is_admin());

-- Keeps updated_at current on every edit.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Content. Same shapes as volley-site/content/*.json (see its README).
-- ---------------------------------------------------------------------------

-- Single values by key: 'banner', 'home', 'viewings' and 'waitlist_form'.
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  tab text not null check (tab in ('cool', 'boring')),
  category text not null,
  question text not null,
  answer text not null default '',
  list text[] not null default '{}',
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  location text not null default '',
  -- Its date: the articles show newest first. meta is the old free-text
  -- byline, shown only while there's no date.
  date date,
  meta text not null default '',
  category text not null default '',
  excerpt text not null default '',
  image text not null default '',
  hero text not null default '',
  aspect text not null default '',
  body jsonb not null default '[]',
  published boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The editable parts of each location (a "building" in the admin): its
-- page, (status, summary) its card in the Locations carousel, (sort) its
-- place in that carousel, and (photos) every photo on its page and card,
-- by slot. null keeps the value, the order or the photo in
-- volley-site/lib/locations.js.
create table if not exists public.locations (
  slug text primary key,
  name text,
  beds integer,
  beds_word text,
  address text,
  city text,
  footer text,
  status text,
  visibility text,
  card_colour text,
  summary text,
  sort integer,
  photos jsonb,
  description jsonb,
  pricelist text,
  buttons jsonb,
  tour text,
  sections jsonb,
  stats jsonb,
  rooms jsonb,
  included jsonb,
  area jsonb,
  updated_at timestamptz not null default now()
);
-- Added after the first release, for projects set up before then.
alter table public.locations add column if not exists status text;
alter table public.locations add column if not exists summary text;
alter table public.locations add column if not exists sort integer;
alter table public.locations add column if not exists photos jsonb;
alter table public.locations add column if not exists included jsonb;
alter table public.locations add column if not exists area jsonb;
alter table public.locations add column if not exists name text;
alter table public.locations add column if not exists beds integer;
alter table public.locations add column if not exists beds_word text;
alter table public.locations add column if not exists buttons jsonb;
alter table public.locations add column if not exists tour text;
alter table public.locations add column if not exists sections jsonb;
alter table public.articles add column if not exists date date;

do $$
declare t text;
begin
  foreach t in array array['settings', 'faqs', 'articles', 'locations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop trigger if exists touch on public.%I', t);
    execute format(
      'create trigger touch before update on public.%I
         for each row execute function public.touch_updated_at()', t);

    execute format('drop policy if exists "Admins add" on public.%I', t);
    execute format(
      'create policy "Admins add" on public.%I
         for insert to authenticated with check (public.is_admin())', t);
    execute format('drop policy if exists "Admins edit" on public.%I', t);
    execute format(
      'create policy "Admins edit" on public.%I
         for update to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists "Admins delete" on public.%I', t);
    execute format(
      'create policy "Admins delete" on public.%I
         for delete to authenticated using (public.is_admin())', t);
  end loop;

  foreach t in array array['settings', 'faqs', 'locations'] loop
    execute format('drop policy if exists "Anyone reads" on public.%I', t);
    execute format(
      'create policy "Anyone reads" on public.%I
         for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Drafts stay hidden from the public site.
drop policy if exists "Anyone reads published" on public.articles;
create policy "Anyone reads published" on public.articles
  for select to anon, authenticated using (published or public.is_admin());

-- ---------------------------------------------------------------------------
-- Clean-up: tour bookings and the waitlist moved out
-- ---------------------------------------------------------------------------

-- They used to live here; the website now saves them to the Volley app's
-- project. Projects set up before the move still have the old tables and
-- functions. Once the website is saving to the app's project, run these
-- four lines once to remove them (only test data was ever in them):
--
--   drop function if exists public.book_tour(text, text, date, text, text, text, text, text, text, text, text, text);
--   drop function if exists public.taken_slots(text, date, date);
--   drop table if exists public.tour_bookings;
--   drop table if exists public.waitlist;

-- ---------------------------------------------------------------------------
-- File storage: photos and PDFs uploaded in the admin
-- ---------------------------------------------------------------------------

-- Public, so the website loads files by URL with no login. Files are never
-- overwritten (each upload gets a new name), so they cache safely.
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do update set public = true;

drop policy if exists "Admins upload media" on storage.objects;
create policy "Admins upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "Admins delete media" on storage.objects;
create policy "Admins delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Your first admin. First create the login under Authentication > Users >
-- Add user (email + password), then run this with that email. Add more
-- people later from the admin's Team page.
-- ---------------------------------------------------------------------------

-- insert into public.admin_users (email, name)
--   values ('you@example.com', 'Your name')
--   on conflict do nothing;
