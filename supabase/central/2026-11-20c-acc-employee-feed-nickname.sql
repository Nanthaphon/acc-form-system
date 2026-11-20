-- ⚠ รันในโปรเจค it-asset-management (wvxjhjcliusgsfyqfqnh)
-- เพิ่มชื่อเล่น (nickname) ในข้อมูลที่ส่งให้ Acc Documents · รันซ้ำได้
-- (คอลัมน์ที่ส่งออกเปลี่ยน จึงต้องลบฟังก์ชันเดิมแล้วสร้างใหม่ — token เดิมยังใช้ได้)

drop function if exists public.acc_employee_feed(text);

create function public.acc_employee_feed(token text)
returns table (
  emp_id text, company text, name_prefix text, first_name text, last_name text, nickname text,
  "position" text, department text, m365_email text, resign_date text
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if token is null or token is distinct from
     (select decrypted_secret from vault.decrypted_secrets where name = 'acc_feed_token' limit 1) then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  return query
    select e.emp_id::text, e.company::text, e.name_prefix::text, e.first_name::text, e.last_name::text,
           e.nickname::text, e."position"::text, e.department::text, e.m365_email::text, e.resign_date::text
    from report.employees e
    where coalesce(btrim(e.emp_id::text), '') <> '';
end $$;

revoke all on function public.acc_employee_feed(text) from public;
grant execute on function public.acc_employee_feed(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ส่งข้อมูลรอบใหม่ไป Acc ทันที (ชื่อเล่นจะเข้าไปเลย)
select public.acc_notify_employee_sync();
