-- ============================================================================
-- 2026-09-18 — integrity and permission fixes found while reviewing the code.
-- Each block says what was wrong and why. Run once in Supabase → SQL Editor.
-- Safe to re-run.
-- ============================================================================


-- 1) Deleting a document silently did nothing --------------------------------
-- RLS is on for `submissions` but no DELETE policy was ever written, so every
-- delete matched zero rows and PostgREST answered 204 with no error: the app
-- reported success while the document stayed. Worse, it removes the attached
-- files BEFORE the row, so the files were really gone and the document was left
-- pointing at nothing.
drop policy if exists submissions_delete on submissions;
create policy submissions_delete on submissions for delete
  using ("createdBy" = auth.uid() or is_admin());


-- 2) Anyone could write their own signatures onto a document -----------------
-- The update policy covers the whole row, so the owner could PATCH the
-- `signatures` column directly and skip sign_document() entirely — stamping a
-- colleague's signature image (readable from any document they can see) onto
-- any document of their own. printCount, docNumber and createdBy were writable
-- the same way. Only the columns the app actually edits stay writable; the rest
-- are reachable only through the SECURITY DEFINER functions below.
revoke update on submissions from authenticated;
grant update ("header", "items", "totals", "updatedAt", "attachments")
  on submissions to authenticated;


-- 3) The functions that own those columns need to run as owner ---------------
-- increment_print and next_doc_number ran as the caller, so they stop working
-- the moment the grants above (and the counters policy below) tighten.
create or replace function increment_print(sub_id uuid) returns void
language sql security definer set search_path = public as $$
  update submissions
  set "printCount" = "printCount" + 1,
      "lastPrintedAt" = (extract(epoch from now()) * 1000)::bigint
  where id = sub_id
$$;

create or replace function next_doc_number(form_type text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into counters ("formType","lastNumber") values (form_type, 1)
  on conflict ("formType") do update set "lastNumber" = counters."lastNumber" + 1
  returning "lastNumber" into n;
  return n;
end $$;


-- 4) Running document numbers were editable by any signed-in user ------------
-- counters_all allowed every authenticated user to write any row, so anyone
-- could rewind lastNumber and hand out duplicate document numbers. The table is
-- only ever touched by next_doc_number(), which now runs as owner.
drop policy if exists counters_all on counters;
revoke all on counters from authenticated, anon;


-- 5) A signed document could still be edited ---------------------------------
-- protect_submission_content() was dropped when the approval flow was replaced
-- by online signatures and never put back, so amounts could be changed after a
-- signature was stamped and the signature stayed on the changed document.
-- Correcting a signed document now means taking the signature off first
-- (unsign_document), which leaves a trace, rather than quietly rewriting it.
create or replace function protect_signed_content() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from jsonb_array_elements(coalesce(old.signatures, '[]'::jsonb)) e
    where e->>'status' = 'signed'
  ) and (new.header is distinct from old.header
      or new.items is distinct from old.items
      or new.totals is distinct from old.totals) then
    raise exception 'เอกสารนี้มีลายเซ็นแล้ว แก้ไขไม่ได้ — ลบลายเซ็นออกก่อนจึงจะแก้ได้';
  end if;
  return new;
end $$;
drop trigger if exists protect_signed on submissions;
create trigger protect_signed before update on submissions
  for each row execute function protect_signed_content();


-- 6) The staff directory was readable without signing in ---------------------
-- list_signers() is SECURITY DEFINER, and a function is executable by PUBLIC
-- unless told otherwise — so anyone holding the anon key could read every
-- employee's name and uid without an account.
revoke all on function list_signers() from public, anon;
grant execute on function list_signers() to authenticated;


-- 7) Employees could move themselves into another access group ---------------
-- profiles."accessGroup" decides which forms someone sees, but the guard on
-- profile updates only covered role, employeeId and isSuperAdmin — so anyone
-- could grant themselves another group's forms, or clear their own
-- "must change password" flag.
create or replace function protect_profile_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;

  if tg_op = 'INSERT' then
    if new."isSuperAdmin" and not is_super_admin() then
      raise exception 'only the super admin can create a super admin';
    end if;
    return new;
  end if;

  -- Only the Super Admin may touch a Super Admin's record, or grant/remove the flag.
  if (old."isSuperAdmin" or new."isSuperAdmin" is distinct from old."isSuperAdmin") and not is_super_admin() then
    raise exception 'only the super admin can change this account';
  end if;
  if new."isSuperAdmin" and new.role <> 'admin' then
    raise exception 'the super admin must stay an admin';
  end if;

  -- Fields only an admin may set on anyone, including on their own profile.
  if not is_admin() and (
       new.role <> old.role
    or new."employeeId" <> old."employeeId"
    or new."accessGroup" is distinct from old."accessGroup"
    or new."departmentId" is distinct from old."departmentId"
  ) then
    raise exception 'cannot change role, employeeId, accessGroup or department';
  end if;

  -- The password flags follow a real password change, so they may only be
  -- turned OFF by the account itself (markOwnPasswordChanged) or by an admin.
  if not is_admin() and (
       (new."mustChangePassword" and not old."mustChangePassword")
    or (coalesce(new."passwordIsDefault", false) and not coalesce(old."passwordIsDefault", false))
  ) then
    raise exception 'cannot raise the password flags';
  end if;

  return new;
end $$;
drop trigger if exists protect_profile on profiles;
create trigger protect_profile before insert or update on profiles
  for each row execute function protect_profile_fields();


-- 8) SECURITY DEFINER functions without a fixed search_path ------------------
-- Supabase's own linter flags these: a definer function that does not pin
-- search_path can be pointed at objects the caller controls.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where uid = auth.uid() and role = 'admin')
$$;

create or replace function list_signers() returns table(uid uuid, name text)
language sql stable security definer set search_path = public as $$
  select uid, trim("firstName" || ' ' || "lastName") as name from profiles order by "firstName", "lastName"
$$;

create or replace function delete_employee(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'only admin can delete employees';
  end if;
  if target = auth.uid() then
    raise exception 'cannot delete yourself';
  end if;
  if exists (select 1 from profiles where uid = target and "isSuperAdmin") then
    raise exception 'cannot delete the super admin';
  end if;
  delete from submissions where "createdBy" = target;
  delete from auth.users where id = target;  -- cascades to profiles (on delete cascade)
end $$;


-- 9) assign_signers() trusted whatever the browser sent ----------------------
-- It stored the assignment list as given, so a caller could hand it entries
-- already marked 'signed' with a signature image attached — the same forgery
-- that section 2 closes off for direct writes. Incoming entries are now
-- normalised: they may only ever arrive as "waiting to sign".
create or replace function assign_signers(sub_id uuid, assignments jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r submissions;
begin
  select * into r from submissions where id = sub_id;
  if not found then raise exception 'not found'; end if;
  if r."createdBy" <> auth.uid() then raise exception 'only the creator can assign signers'; end if;
  update submissions set signatures = (
    select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select e as x from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e where e->>'status' = 'signed'
      union all
      select jsonb_build_object(
               'blockId', a->>'blockId',
               'blockLabel', a->>'blockLabel',
               'assignedUid', a->>'assignedUid',
               'assignedName', a->>'assignedName',
               'status', 'pending') as x
        from jsonb_array_elements(coalesce(assignments, '[]'::jsonb)) a
        where a->>'blockId' not in (
          select s->>'blockId' from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) s where s->>'status' = 'signed'
        )
    ) q
  ) where id = sub_id;
end $$;


-- Let the API see the changes right away.
notify pgrst, 'reload schema';
