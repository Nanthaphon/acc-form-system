-- ============================================================================
-- 2026-10-02 — an Account Admin can set an employee's password too.
--
-- Until now only the Super Admin could, which meant nobody could help an
-- employee who had forgotten their password while the Super Admin was away.
-- The Super Admin's OWN account stays protected: only the Super Admin can
-- change that one.
--
-- Passwords are stored hashed and can never be read back — setting a new one
-- and handing it over is the only way to get someone back in.
--
-- Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

create or replace function admin_set_password(target uuid, new_password text, must_change boolean default true)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare emp text; target_is_super boolean;
begin
  if not is_admin() then
    raise exception 'only an admin can set passwords';
  end if;
  select "employeeId", coalesce("isSuperAdmin", false) into emp, target_is_super from profiles where uid = target;
  if not found then raise exception 'employee not found'; end if;
  if target_is_super and not is_super_admin() then
    raise exception 'only the super admin can change the super admin password';
  end if;
  if coalesce(length(new_password), 0) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;
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

notify pgrst, 'reload schema';
