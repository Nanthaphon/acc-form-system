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

-- ---- Slice 2: Approvers (who may sign, which departments, signature image) --
-- canApprove / coverage are admin-managed (protected below); signatureImage is
-- uploaded by the approver themselves in their own profile.
alter table profiles add column if not exists "canApprove" boolean not null default false;
alter table profiles add column if not exists "approverAllDepartments" boolean not null default false;
alter table profiles add column if not exists "approverDepartments" jsonb not null default '[]';
alter table profiles add column if not exists "signatureImage" text;

-- Only admins may grant/adjust approver rights or coverage. A non-admin editing
-- their own profile (e.g. uploading a signature) must not flip these fields.
create or replace function protect_approver_fields() returns trigger language plpgsql as $$
begin
  if not is_admin() then
    if new."canApprove" is distinct from old."canApprove"
       or new."approverAllDepartments" is distinct from old."approverAllDepartments"
       or new."approverDepartments" is distinct from old."approverDepartments" then
      raise exception 'cannot change approver rights';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_approver on profiles;
create trigger protect_approver before update on profiles
  for each row execute function protect_approver_fields();
