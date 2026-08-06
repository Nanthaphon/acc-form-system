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

-- ---- Slice 3: Approval workflow (request / approve / reject) ----------------
alter table submissions add column if not exists status text not null default 'draft';
alter table submissions add column if not exists "departmentId" text;
alter table submissions add column if not exists "requestedAt" bigint;
alter table submissions add column if not exists "approvedBy" uuid;
alter table submissions add column if not exists "approvedByName" text;
alter table submissions add column if not exists "approverSignature" text;
alter table submissions add column if not exists "approvedAt" bigint;
alter table submissions add column if not exists "rejectReason" text;

-- Does the current user cover this department as an approver?
create or replace function is_approver_for(dep text) returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles
    where uid = auth.uid() and "canApprove" = true and dep is not null
      and ("approverAllDepartments" = true or "approverDepartments" ? dep)
  )
$$;

-- Approvers may read submissions in the departments they cover (for the inbox).
drop policy if exists submissions_approver_select on submissions;
create policy submissions_approver_select on submissions for select using (is_approver_for("departmentId"));

-- Employee sends their own saved document for approval (routes by their dept).
create or replace function request_approval(sub_id uuid) returns void language plpgsql security definer as $$
declare dep text;
begin
  select "departmentId" into dep from profiles where uid = auth.uid();
  if dep is null then raise exception 'no department set for requester'; end if;
  update submissions
    set status = 'pending', "departmentId" = dep,
        "requestedAt" = (extract(epoch from now()) * 1000)::bigint,
        "rejectReason" = null
    where id = sub_id and "createdBy" = auth.uid() and status in ('draft','rejected');
  if not found then raise exception 'cannot request approval for this document'; end if;
end $$;

-- Approver signs: stamps their name + signature snapshot onto the document.
create or replace function approve_submission(sub_id uuid) returns void language plpgsql security definer as $$
declare r submissions; me profiles;
begin
  select * into r from submissions where id = sub_id;
  if not found then raise exception 'not found'; end if;
  if r.status <> 'pending' then raise exception 'document is not pending'; end if;
  if not is_approver_for(r."departmentId") then raise exception 'not an approver for this department'; end if;
  if r."createdBy" = auth.uid() then raise exception 'cannot approve your own document'; end if;
  select * into me from profiles where uid = auth.uid();
  update submissions set
    status = 'approved',
    "approvedBy" = auth.uid(),
    "approvedByName" = trim(me."firstName" || ' ' || me."lastName"),
    "approverSignature" = me."signatureImage",
    "approvedAt" = (extract(epoch from now()) * 1000)::bigint
  where id = sub_id;
end $$;

-- Approver sends the document back with a reason.
create or replace function reject_submission(sub_id uuid, reason text) returns void language plpgsql security definer as $$
declare r submissions;
begin
  select * into r from submissions where id = sub_id;
  if not found then raise exception 'not found'; end if;
  if r.status <> 'pending' then raise exception 'document is not pending'; end if;
  if not is_approver_for(r."departmentId") then raise exception 'not an approver for this department'; end if;
  update submissions set status = 'rejected', "rejectReason" = reason where id = sub_id;
end $$;

-- Lock the document content once it is pending or approved (non-admins), so
-- numbers can't change after it's out for / has a signature. Reject reopens it.
create or replace function protect_submission_content() returns trigger language plpgsql as $$
begin
  if not is_admin() and old.status in ('pending','approved') then
    if new.header is distinct from old.header
       or new.items is distinct from old.items
       or new.totals is distinct from old.totals then
      raise exception 'document is locked (% )', old.status;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_submission on submissions;
create trigger protect_submission before update on submissions
  for each row execute function protect_submission_content();
