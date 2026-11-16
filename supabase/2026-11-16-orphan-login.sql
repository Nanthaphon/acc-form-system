-- ============================================================================
-- 2026-11-16 — "เพิ่มพนักงานไม่สำเร็จ: User already registered"
--
-- Adding an employee is two steps: the login account, then the profile row.
-- When the second step failed, the login account stayed behind with no
-- profile: nobody sees it in the employee list, yet that employee ID could
-- never be added again — the login email was already taken.
--
-- release_orphan_login() frees such an account so the page can carry on:
--   'free'      no login account uses this employee ID
--   'taken'     it belongs to a real employee (has a profile or documents) —
--               left alone
--   'released'  it had no profile and no documents; it is deleted
-- The page calls it when sign-up says "already registered", and again to undo
-- its own login account when saving the profile fails.
--
-- Needs login_email() from 2026-09-11-super-admin.sql.
-- Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

create or replace function release_orphan_login(employee_id text) returns text
language plpgsql security definer set search_path = public as $$
declare em text; auth_id uuid;
begin
  if not is_admin() then
    raise exception 'only admin can add employees';
  end if;
  em := login_email(employee_id);
  select id into auth_id from auth.users where lower(email) = em;
  if auth_id is null then return 'free'; end if;
  if exists (select 1 from profiles where uid = auth_id)
     or exists (select 1 from submissions where "createdBy" = auth_id) then
    return 'taken';
  end if;
  delete from auth.users where id = auth_id;
  return 'released';
end $$;
revoke all on function release_orphan_login(text) from public, anon;
grant execute on function release_orphan_login(text) to authenticated;

notify pgrst, 'reload schema';

-- Read-only: every login account that has no employee profile. Each one is an
-- employee ID that could not be added. Nothing needs doing by hand — adding
-- that employee again on the page now frees the account by itself.
select u.email as "บัญชีค้าง (ไม่มีข้อมูลพนักงาน)", u.created_at as "สร้างเมื่อ"
  from auth.users u
  left join profiles p on p.uid = u.id
 where p.uid is null
 order by u.created_at desc;
