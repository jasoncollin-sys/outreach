-- migrations/001_structure_day.sql
-- OUTREACH — STRUCTURE DAY migration
-- =====================================================================
-- What this does:
--   1. Creates `agencies` and moves the agency-level rows (no first name)
--      out of `agents` into it.
--   2. Adds `agency_id` to `agents` and links each person to their agency
--      by exact agency name, then deletes the agency-level rows from `agents`
--      so `agents` becomes a people-only table.
--   3. Creates `deals` (flow data — accrues from now, house law 7).
--   4. Creates `courses` (CO-xxx).
--   5. Applies the house RLS pattern to all three new tables:
--      public (anonymous) read, writes only for jason.collin@gmail.com.
--
-- HOW TO RUN:
--   Paste this whole file into the Supabase SQL Editor and run it ONCE,
--   top to bottom. It is wrapped in a transaction: if anything errors,
--   nothing is committed — fix and re-run.
--
-- BEFORE YOU RUN (house law — always CSV-backup affected tables):
--   select * from agents;        -> Export CSV
--   select * from editors;       -> Export CSV   (unaffected, but back up anyway)
--   select * from competitions;  -> Export CSV   (unaffected, but back up anyway)
--   The people/agency split DELETEs the agency rows from `agents`, so the
--   `agents` backup is the important one. Guards make re-running safe, but
--   back up regardless.
-- =====================================================================

begin;

-- 1) AGENCIES ---------------------------------------------------------
create table if not exists agencies (
  id                  text primary key,          -- AG-xxx, inherited from the agency-level row
  name                text not null,             -- was agents.agency
  agency_size         text,
  website             text,
  submission_email    text,
  submission_page_url text,
  accepts_unsolicited text,
  submission_policy   text,
  genres              text[] default '{}',
  notable_clients     text,
  recent_deals_notes  text,
  ai_policy           text,
  bio                 text,
  press               text,
  source_url          text,
  last_verified       date,
  record_status       text default 'Needs verification'
);

-- Copy the agency-level rows (no first name) out of `agents`.
insert into agencies (
  id, name, agency_size, website, submission_email, submission_page_url,
  accepts_unsolicited, submission_policy, genres, notable_clients,
  recent_deals_notes, ai_policy, bio, press, source_url, last_verified, record_status
)
select
  id, agency, agency_size, website, submission_email, submission_page_url,
  accepts_unsolicited, submission_policy, coalesce(genres, '{}'), notable_clients,
  recent_deals_notes, ai_policy, bio, press, source_url, last_verified,
  coalesce(record_status, 'Needs verification')
from agents
where (first_name is null or first_name = '')
on conflict (id) do nothing;

-- 2) PEOPLE link to their agency -------------------------------------
alter table agents add column if not exists agency_id text references agencies(id);

-- Match each person to their agency by the exact agency name (house convention:
-- "person rows name their parent agency exactly in the agency field").
update agents a
set agency_id = ag.id
from agencies ag
where (a.first_name is not null and a.first_name <> '')
  and a.agency_id is null
  and a.agency = ag.name;

-- Remove the agency-level rows now they live in `agencies`.
-- Only deletes rows that were successfully copied (id is present in agencies).
delete from agents
where (first_name is null or first_name = '')
  and id in (select id from agencies);

-- 3) DEALS ------------------------------------------------------------
-- Flow data. Accrues from now — cannot be backfilled (house law 7).
create table if not exists deals (
  id                  bigint generated always as identity primary key,
  deal_date           date,
  writer              text,
  deal_type           text,
  project             text,
  agency_name         text,
  agent_name          text,
  buyer               text,
  financer            text,
  amount_if_disclosed text,
  source_url          text,
  notes               text,
  created_at          timestamptz default now()
);

-- 4) COURSES ----------------------------------------------------------
create table if not exists courses (
  id                text primary key,             -- CO-xxx
  provider          text,
  course_name       text,
  format            text,
  duration          text,
  cost              text,
  application_route text,
  notable_alumni    text,
  website           text,
  source_url        text,
  last_verified     date,
  record_status     text default 'Needs verification'
);

-- 5) ROW LEVEL SECURITY ----------------------------------------------
-- House pattern: public (anon) read-only; writes only for the owner email.
alter table agencies enable row level security;
alter table deals    enable row level security;
alter table courses  enable row level security;

-- agencies
drop policy if exists agencies_public_read on agencies;
create policy agencies_public_read on agencies for select using (true);
drop policy if exists agencies_owner_write on agencies;
create policy agencies_owner_write on agencies for all
  using ((auth.jwt() ->> 'email') = 'jason.collin@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jason.collin@gmail.com');

-- deals
drop policy if exists deals_public_read on deals;
create policy deals_public_read on deals for select using (true);
drop policy if exists deals_owner_write on deals;
create policy deals_owner_write on deals for all
  using ((auth.jwt() ->> 'email') = 'jason.collin@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jason.collin@gmail.com');

-- courses
drop policy if exists courses_public_read on courses;
create policy courses_public_read on courses for select using (true);
drop policy if exists courses_owner_write on courses;
create policy courses_owner_write on courses for all
  using ((auth.jwt() ->> 'email') = 'jason.collin@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'jason.collin@gmail.com');

commit;

-- =====================================================================
-- POST-CHECK (run these after the commit; eyeball the results):
--   select count(*) from agencies;                                   -- agency-level rows moved
--   select count(*) from agents;                                     -- people only now
--   select count(*) from agents
--     where agency_id is null;                                       -- orphans: people whose
--                                                                     --   `agency` name matched no agency row
--   select id, first_name, last_name, agency
--     from agents where agency_id is null;                           -- reconcile these by hand
-- =====================================================================
