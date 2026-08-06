-- ============================================================================
-- ONLINE APPROVAL FEATURE — migration (branch: feat/online-approval)
-- Runs on top of schema.sql. Everything here is removable via
-- teardown-approval.sql, returning the DB to its pre-feature state.
-- Apply the sections in order as each slice ships.
-- ============================================================================

-- ---- Slice 1: Departments (routing unit for approvals) ---------------------
alter table profiles add column if not exists "departmentId" text;

create table if not exists departments (
  id text primary key,
  name text not null,
  "sortOrder" int not null default 0,
  "createdAt" bigint not null default 0
);
alter table departments enable row level security;
drop policy if exists departments_select on departments;
create policy departments_select on departments for select using (auth.uid() is not null);
drop policy if exists departments_write on departments;
create policy departments_write on departments for all using (is_admin()) with check (is_admin());
