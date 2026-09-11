-- ============================================================================
-- 2026-09-11 — Super Admin and password management.
--   * profiles."isSuperAdmin": the one account (admin001) that may set any
--     employee's password. Other admins ("Account Admin") manage everything
--     else, but cannot edit, delete or demote the Super Admin.
--   * profiles."passwordIsDefault": the password is still the default one
--     (= the employee ID), so the admin pages can show it.
--   * admin_set_password(): the Super Admin sets a new password for anyone.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

alter table profiles add column if not exists "isSuperAdmin" boolean not null default false;

create or replace function is_super_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where uid = auth.uid() and role = 'admin' and "isSuperAdmin")
$$;

-- Guard profile changes. The SQL editor (no signed-in user) may change anything.
create or replace function protect_profile_fields() returns trigger language plpgsql as $$
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
  -- Non-admins can't change their own role or employee ID.
  if not is_admin() and (new.role <> old.role or new."employeeId" <> old."employeeId") then
    raise exception 'cannot change role or employeeId';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on profiles;
create trigger protect_profile before insert or update on profiles
  for each row execute function protect_profile_fields();

-- Existing accounts: only never-changed passwords still had mustChangePassword on.
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles' and column_name = 'passwordIsDefault') then
    alter table profiles add column "passwordIsDefault" boolean not null default true;
    update profiles set "passwordIsDefault" = "mustChangePassword";
  end if;
end $$;

-- Deleting an employee: never the Super Admin.
create or replace function delete_employee(target uuid) returns void language plpgsql security definer as $$
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

-- The Super Admin sets anyone's password (e.g. an employee who forgot theirs).
create or replace function admin_set_password(target uuid, new_password text, must_change boolean default true)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare emp text;
begin
  if not is_super_admin() then
    raise exception 'only the super admin can set passwords';
  end if;
  if coalesce(length(new_password), 0) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;
  select "employeeId" into emp from profiles where uid = target;
  if not found then raise exception 'employee not found'; end if;
  update auth.users
     set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
   where id = target;
  if not found then raise exception 'login account not found'; end if;
  update profiles
     set "mustChangePassword" = must_change, "passwordIsDefault" = (new_password = emp)
   where uid = target;
end $$;
revoke all on function admin_set_password(uuid, text, boolean) from public, anon;
grant execute on function admin_set_password(uuid, text, boolean) to authenticated;

-- admin001 is the Super Admin.
update profiles set "isSuperAdmin" = true, role = 'admin' where "employeeId" = 'admin001';

notify pgrst, 'reload schema';
