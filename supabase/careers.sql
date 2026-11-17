-- Careers: the job listings on the website's /careers page, the
-- applications people send for them, and their CVs.
--
-- Run once: Supabase > SQL Editor > New query, paste this whole file, Run.
-- Safe to run again. Needs schema.sql first (is_admin, touch_updated_at).
--
-- Who can do what:
--   anon (the public website)
--     reads open jobs; sends an application (adds a row, uploads its CV)
--     but can never read one back, theirs included
--   admins
--     everything: add, edit, close and delete jobs; read, update and
--     delete applications; open and delete CVs

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  department text not null default '',
  location text not null default '',
  job_type text not null default '',
  qualifications text not null default '',
  experience text not null default '',
  salary text not null default '',
  -- One or two lines under the title, in the list.
  summary text not null default '',
  -- "Description" and "What will I do?", each as written in the admin.
  description text not null default '',
  duties text not null default '',
  -- Closed jobs stay in the admin, off the website.
  open boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.jobs enable row level security;

drop trigger if exists touch on public.jobs;
create trigger touch before update on public.jobs
  for each row execute function public.touch_updated_at();

drop policy if exists "Anyone reads open jobs" on public.jobs;
create policy "Anyone reads open jobs" on public.jobs
  for select to anon, authenticated using (open or public.is_admin());
drop policy if exists "Admins add" on public.jobs;
create policy "Admins add" on public.jobs
  for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins edit" on public.jobs;
create policy "Admins edit" on public.jobs
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete" on public.jobs;
create policy "Admins delete" on public.jobs
  for delete to authenticated using (public.is_admin());

-- The placeholder the old site had, until the admin writes the real one.
insert into public.jobs (title, department, location, job_type, qualifications, experience, salary, summary, description, duties)
select 'Operations Manager', 'Operations', 'Pretoria', 'Managing', 'Associate', '5+ Years', 'Market value',
  'Keep Volley running like clockwork, from the front desk to the boiler room.',
  'Placeholder: the full description of the role goes here.',
  'Placeholder: what a day in the role looks like goes here.'
where not exists (select 1 from public.jobs);

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  -- Kept if the job is deleted: the title says what they applied for.
  job_id uuid references public.jobs(id) on delete set null,
  job_title text not null default '',
  name text not null default '',
  surname text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  -- In the private `cvs` bucket.
  cv_path text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'interview', 'offered', 'hired', 'declined', 'closed')),
  notes text not null default '',
  interview_at timestamptz,
  -- When each email went, once mailing is set up: { "interview": "<iso>" }.
  emailed jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.job_applications enable row level security;
create index if not exists job_applications_created on public.job_applications (created_at desc);

drop trigger if exists touch on public.job_applications;
create trigger touch before update on public.job_applications
  for each row execute function public.touch_updated_at();

-- The website sends new ones only: no status, notes or interview of its own.
drop policy if exists "Anyone applies" on public.job_applications;
create policy "Anyone applies" on public.job_applications
  for insert to anon, authenticated
  with check (status = 'new' and notes = '' and interview_at is null and emailed = '{}'::jsonb);
drop policy if exists "Admins read" on public.job_applications;
create policy "Admins read" on public.job_applications
  for select to authenticated using (public.is_admin());
drop policy if exists "Admins edit" on public.job_applications;
create policy "Admins edit" on public.job_applications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete" on public.job_applications;
create policy "Admins delete" on public.job_applications
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- CVs: private, PDFs up to 10 MB
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

drop policy if exists "Anyone uploads a CV" on storage.objects;
create policy "Anyone uploads a CV" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'cvs');
drop policy if exists "Admins read CVs" on storage.objects;
create policy "Admins read CVs" on storage.objects
  for select to authenticated using (bucket_id = 'cvs' and public.is_admin());
drop policy if exists "Admins delete CVs" on storage.objects;
create policy "Admins delete CVs" on storage.objects
  for delete to authenticated using (bucket_id = 'cvs' and public.is_admin());
