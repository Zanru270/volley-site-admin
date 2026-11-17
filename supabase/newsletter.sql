-- Newsletter: everyone who signs up through the website's "Not another
-- boring newsletter" section (the home page and each building's page), the
-- welcome email they get, and the newsletters the admin sends them.
--
-- Run once: Supabase > SQL Editor > New query, paste this whole file, Run.
-- Safe to run again (also over the first version of this file). Needs
-- schema.sql first (is_admin, touch_updated_at).
--
-- Who can do what:
--   anon (the public website)
--     signs someone up, or back up, through newsletter_subscribe();
--     unsubscribes someone through newsletter_unsubscribe() with the id
--     from their email's link; reads the welcome email. Never reads the list.
--   admins
--     everything: read, export, unsubscribe and delete sign-ups; edit the
--     welcome email; send newsletters and read what's been sent

-- ---------------------------------------------------------------------------
-- Sign-ups
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 200),
  -- Which page they signed up on: "home", or a building's slug.
  source text not null default '' check (char_length(source) <= 60),
  created_at timestamptz not null default now()
);
alter table public.newsletter_signups
  add column if not exists status text not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed'));
alter table public.newsletter_signups add column if not exists unsubscribed_at timestamptz;
alter table public.newsletter_signups enable row level security;

-- One row per address, whatever its capitals: signing up twice is a no-op.
create unique index if not exists newsletter_signups_email on public.newsletter_signups (lower(email));
create index if not exists newsletter_signups_created on public.newsletter_signups (created_at desc);

-- The website signs up through newsletter_subscribe() only.
drop policy if exists "Anyone signs up" on public.newsletter_signups;
drop policy if exists "Admins read" on public.newsletter_signups;
create policy "Admins read" on public.newsletter_signups
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins add" on public.newsletter_signups;
create policy "Admins add" on public.newsletter_signups
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins edit" on public.newsletter_signups;
create policy "Admins edit" on public.newsletter_signups
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete" on public.newsletter_signups;
create policy "Admins delete" on public.newsletter_signups
  for delete to authenticated using (public.is_admin());

/* Signs `p_email` up, or back up after unsubscribing. Returns the row's id
   when they're new or back (for the welcome email's unsubscribe link), and
   nothing when they were already on the list, so the form can't be used to
   look up anyone's id. */
create or replace function public.newsletter_subscribe(p_email text, p_source text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
  v_status text;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or char_length(v_email) > 200 then
    raise exception 'bad_email';
  end if;
  select id, status into v_id, v_status from newsletter_signups where lower(email) = v_email;
  if v_id is null then
    insert into newsletter_signups (email, source) values (v_email, left(coalesce(p_source, ''), 60))
    returning id into v_id;
    return v_id;
  end if;
  if v_status = 'unsubscribed' then
    update newsletter_signups set status = 'subscribed', unsubscribed_at = null where id = v_id;
    return v_id;
  end if;
  return null;
end;
$$;
revoke all on function public.newsletter_subscribe(text, text) from public;
grant execute on function public.newsletter_subscribe(text, text) to anon, authenticated;

/* The unsubscribe link in every email: /newsletter/unsubscribe?id=<id>.
   True when that id is on the list (unsubscribed now, or already). */
create or replace function public.newsletter_unsubscribe(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update newsletter_signups
    set status = 'unsubscribed', unsubscribed_at = coalesce(unsubscribed_at, now())
    where id = p_id;
  return found;
end;
$$;
revoke all on function public.newsletter_unsubscribe(uuid) from public;
grant execute on function public.newsletter_unsubscribe(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The welcome email: one row. The admin saves it ready to send (html and
-- text, with %recipient.unsub_id% where each person's id goes); the
-- website sends it to each new sign-up while `welcome_on`.
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_settings (
  id int primary key default 1 check (id = 1),
  welcome_on boolean not null default false,
  welcome jsonb not null default '{}'::jsonb,
  welcome_subject text not null default '',
  welcome_html text not null default '',
  welcome_text text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.newsletter_settings enable row level security;
insert into public.newsletter_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists touch on public.newsletter_settings;
create trigger touch before update on public.newsletter_settings
  for each row execute function public.touch_updated_at();

drop policy if exists "Anyone reads" on public.newsletter_settings;
create policy "Anyone reads" on public.newsletter_settings
  for select to anon, authenticated using (true);
drop policy if exists "Admins edit" on public.newsletter_settings;
create policy "Admins edit" on public.newsletter_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Sent newsletters: what went, to how many, and who sent it
-- ---------------------------------------------------------------------------

create table if not exists public.newsletter_sends (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  -- The email as written: { heading, body, photo, button: { label, href } }.
  content jsonb not null default '{}'::jsonb,
  sent_by text not null default '',
  recipients int not null default 0,
  failed int not null default 0,
  sent_at timestamptz not null default now()
);
alter table public.newsletter_sends enable row level security;
create index if not exists newsletter_sends_sent on public.newsletter_sends (sent_at desc);

drop policy if exists "Admins read" on public.newsletter_sends;
create policy "Admins read" on public.newsletter_sends
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins add" on public.newsletter_sends;
create policy "Admins add" on public.newsletter_sends
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins delete" on public.newsletter_sends;
create policy "Admins delete" on public.newsletter_sends
  for delete to authenticated using (public.is_admin());
