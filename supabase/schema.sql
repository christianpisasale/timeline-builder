-- ============================================================================
-- Timeline App - Database Schema (Phase 1: core editor)
-- Run this in the Supabase SQL editor.
-- ============================================================================

-- Supabase provides auth.users automatically. We mirror a lightweight profile.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  org         text default 'bupa',            -- simple org grouping for team sharing
  created_at  timestamptz default now()
);

-- A timeline = one roadmap document.
create table if not exists timelines (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  org          text default 'bupa',
  title        text not null default 'Untitled timeline',
  description  text default '',
  -- chart window + sprint config, mirrors what the HTML hardcoded
  chart_start  date not null,
  chart_end    date not null,
  sprint_len_weeks int not null default 2,
  first_sprint_no  int,                        -- e.g. 2615; optional
  is_public    boolean default false,          -- for Phase 2 share links
  public_slug  text unique,                     -- for Phase 2 share links
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Squads are per-timeline so each roadmap can define its own teams + colours.
create table if not exists squads (
  id           uuid primary key default gen_random_uuid(),
  timeline_id  uuid not null references timelines(id) on delete cascade,
  name         text not null,                  -- 'Orange', 'Thunder', ...
  tint         text not null default '#f2f3f6', -- squad cell background
  bar_color    text not null default '#0079c8', -- bar/diamond colour
  sort_order   int not null default 0
);

-- Rows = milestones / activities.
create table if not exists rows (
  id             uuid primary key default gen_random_uuid(),
  timeline_id    uuid not null references timelines(id) on delete cascade,
  squad_id       uuid references squads(id) on delete set null,
  sort_order     int not null default 0,
  milestone      text not null default '',
  rag            text not null default 'green', -- green | amber | red | none
  -- Dates: original (baseline) vs revised (current). Revised drives rendering
  -- when present, else original is used.
  original_start   date,
  original_finish  date,
  revised_start    date,
  revised_finish   date,
  is_milestone   boolean not null default false, -- true = diamond, false = bar
  state          text not null default 'active', -- active | done | external
  created_at     timestamptz default now()
);

-- Notes shown ABOVE the timeline, optionally anchored to a row.
create table if not exists notes (
  id           uuid primary key default gen_random_uuid(),
  timeline_id  uuid not null references timelines(id) on delete cascade,
  row_id       uuid references rows(id) on delete cascade, -- null = general note
  body         text not null default '',
  anchor_date  date,                            -- optional: pin note to a date
  created_at   timestamptz default now()
);

-- ============================================================================
-- Row Level Security: team members (same org) can read; owners can write.
-- ============================================================================
alter table profiles  enable row level security;
alter table timelines enable row level security;
alter table squads    enable row level security;
alter table rows      enable row level security;
alter table notes     enable row level security;

-- profiles: a user sees/edits their own profile
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- helper: is the current user in the same org as a timeline?
-- (kept simple for v1: everyone is 'bupa')
create policy "read org timelines" on timelines
  for select using (
    org = (select org from profiles where id = auth.uid())
    or is_public = true
  );
create policy "insert own timelines" on timelines
  for insert with check (owner_id = auth.uid());
create policy "update own timelines" on timelines
  for update using (owner_id = auth.uid());
create policy "delete own timelines" on timelines
  for delete using (owner_id = auth.uid());

-- child tables inherit access via their parent timeline
create policy "read squads" on squads for select using (
  exists (select 1 from timelines t where t.id = squads.timeline_id
    and (t.org = (select org from profiles where id = auth.uid()) or t.is_public)));
create policy "write squads" on squads for all using (
  exists (select 1 from timelines t where t.id = squads.timeline_id and t.owner_id = auth.uid()))
  with check (
  exists (select 1 from timelines t where t.id = squads.timeline_id and t.owner_id = auth.uid()));

create policy "read rows" on rows for select using (
  exists (select 1 from timelines t where t.id = rows.timeline_id
    and (t.org = (select org from profiles where id = auth.uid()) or t.is_public)));
create policy "write rows" on rows for all using (
  exists (select 1 from timelines t where t.id = rows.timeline_id and t.owner_id = auth.uid()))
  with check (
  exists (select 1 from timelines t where t.id = rows.timeline_id and t.owner_id = auth.uid()));

create policy "read notes" on notes for select using (
  exists (select 1 from timelines t where t.id = notes.timeline_id
    and (t.org = (select org from profiles where id = auth.uid()) or t.is_public)));
create policy "write notes" on notes for all using (
  exists (select 1 from timelines t where t.id = notes.timeline_id and t.owner_id = auth.uid()))
  with check (
  exists (select 1 from timelines t where t.id = notes.timeline_id and t.owner_id = auth.uid()));

-- auto-create a profile row when a new auth user signs up
-- (search_path is set explicitly: the auth trigger runs under a role whose
-- default search_path excludes "public", so an unqualified table name here
-- fails with "Database error saving new user" on every signup)
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- keep updated_at fresh
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists timelines_touch on timelines;
create trigger timelines_touch before update on timelines
  for each row execute function touch_updated_at();
