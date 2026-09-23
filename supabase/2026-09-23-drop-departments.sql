-- ============================================================================
-- 2026-09-23 — remove the department LIST, which nothing uses any more.
--
-- 🔴 THIS DELETES DATA AND CANNOT BE UNDONE. Read the note below before running.
--
-- The `departments` table and `profiles."departmentId"` are the last of the
-- approval routing that was replaced by online signatures: an employee belonged
-- to a department so a request could be routed to whoever approved for it.
-- There is no routing any more, and the admin page that maintained the list has
-- been removed from the app, so both are dead weight.
--
-- WHAT IS KEPT: `profiles.department` — the plain text department on a person's
-- record. It is still shown on the employee pages, searched, and filled in by
-- the CSV import. This script does not touch it.
--
-- YOU DO NOT HAVE TO RUN THIS. With the app updated, the table and the column
-- simply sit unused and cost nothing. Running it only tidies the database.
-- If you are unsure, leave it — everything works either way.
--
-- BEFORE RUNNING: the two SELECTs below show exactly what will be lost. Run
-- them on their own first and look at the results.
-- ============================================================================

-- What is in the list today (these rows will be deleted):
select id, name from departments order by "sortOrder";

-- People still carrying a departmentId (the id goes; their text department stays):
select "employeeId", "firstName", "lastName", department as "department (kept)",
       "departmentId" as "departmentId (removed)"
from profiles where "departmentId" is not null order by "employeeId";


-- ============================================================================
-- Everything below this line does the removal. Run it only after looking at the
-- results above.
-- ============================================================================

-- The guard on profile updates names "departmentId", so it has to stop doing
-- that before the column can go, or every profile update would fail.
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
  ) then
    raise exception 'cannot change role, employeeId or accessGroup';
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

-- Now the column and the table itself.
alter table profiles drop column if exists "departmentId";
drop table if exists departments;

-- Let the API forget they existed.
notify pgrst, 'reload schema';
