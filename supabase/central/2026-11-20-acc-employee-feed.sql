-- ⚠ รันในโปรเจค it-asset-management (wvxjhjcliusgsfyqfqnh) ไม่ใช่โปรเจคของ Acc Documents
--
-- ให้ระบบ Acc Documents อ่านข้อมูลพนักงานจาก report.employees ได้ เฉพาะคอลัมน์ที่ใช้
-- ผ่านฟังก์ชันเดียว ที่ต้องส่ง token ลับมาด้วย (ไม่ต้องเปิด schema report ให้ Data API
-- และไม่ต้องให้ service role key ของโปรเจคนี้ออกไป)
--
-- รันได้ซ้ำ: token เดิมยังใช้ได้ บรรทัดสุดท้ายแสดง token ให้ก๊อปไปใส่เป็น secret
-- CENTRAL_FEED_TOKEN ของ edge function sync-employees (ดู docs/central-employees.md)

-- 1) token ลับ เก็บใน Vault
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'acc_feed_token') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'acc_feed_token',
      'Acc Documents อ่าน public.acc_employee_feed()');
  end if;
end $$;

-- 2) ฟังก์ชันที่ Acc Documents เรียก
create or replace function public.acc_employee_feed(token text)
returns table (
  emp_id text, company text, name_prefix text, first_name text, last_name text,
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
           e."position"::text, e.department::text, e.m365_email::text, e.resign_date::text
    from report.employees e
    where coalesce(btrim(e.emp_id::text), '') <> '';
end $$;

revoke all on function public.acc_employee_feed(text) from public;
grant execute on function public.acc_employee_feed(text) to anon, authenticated, service_role;

-- 3) token ที่ต้องก๊อป
select decrypted_secret as "CENTRAL_FEED_TOKEN" from vault.decrypted_secrets where name = 'acc_feed_token';
