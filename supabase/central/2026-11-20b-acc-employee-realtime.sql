-- ⚠ รันในโปรเจค it-asset-management (wvxjhjcliusgsfyqfqnh) หลังไฟล์ 2026-11-20-acc-employee-feed.sql
--
-- ซิงก์ข้อมูลพนักงานไป Acc Documents ทันทีที่เพิ่ม/แก้/ลบพนักงาน:
-- trigger บนตารางจริงที่อยู่หลัง report.employees เรียก edge function sync-employees
-- ของ Acc Documents (ผ่าน pg_net หลัง commit ไม่ทำให้การบันทึกที่นี่ช้าหรือล้ม)
-- ใช้ token เดิม (vault: acc_feed_token) เป็นรหัสลับ ไม่ต้องตั้ง secret เพิ่ม
--
-- สำรอง: ซิงก์ทุกชั่วโมงด้วย pg_cron เผื่อมีรอบที่เรียกไม่สำเร็จ
-- รันซ้ำได้ · ยกเลิกดูท้ายไฟล์

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- เรียก Acc Documents ให้ซิงก์ (คืนทันที pg_net ส่งให้เองหลัง commit)
create or replace function public.acc_notify_employee_sync()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://wrujttmqawcvcrqqhcno.supabase.co/functions/v1/sync-employees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'acc_feed_token' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
end $$;
revoke all on function public.acc_notify_employee_sync() from public, anon, authenticated;

create or replace function public.acc_employee_changed()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.acc_notify_employee_sync();
  return null;
exception when others then
  return null; -- ซิงก์ไม่ได้ ก็ไม่ทำให้การบันทึกพนักงานที่นี่ล้ม
end $$;
revoke all on function public.acc_employee_changed() from public, anon, authenticated;

-- trigger บนทุกตารางจริงที่ report.employees อ่าน และมีคอลัมน์ emp_id
-- (ครั้งละหนึ่งคำสั่ง ไม่ใช่ทีละแถว: นำเข้า 100 แถวก็ซิงก์รอบเดียว)
do $$
declare t record;
begin
  for t in
    select distinct c.oid::regclass as rel, n.nspname, c.relname
    from information_schema.view_table_usage u
    join pg_namespace n on n.nspname = u.table_schema
    join pg_class c on c.relnamespace = n.oid and c.relname = u.table_name
    where u.view_schema = 'report' and u.view_name = 'employees'
      and c.relkind in ('r', 'p')
      and exists (select 1 from information_schema.columns k
                  where k.table_schema = u.table_schema and k.table_name = u.table_name and k.column_name = 'emp_id')
  loop
    execute format('drop trigger if exists acc_employee_sync on %s', t.rel);
    execute format('create trigger acc_employee_sync after insert or update or delete on %s
                    for each statement execute function public.acc_employee_changed()', t.rel);
    raise notice 'ติด trigger ที่ %.%', t.nspname, t.relname;
  end loop;
end $$;

-- สำรอง ทุกชั่วโมง
do $$ begin
  if exists (select 1 from cron.job where jobname = 'acc-employee-sync') then
    perform cron.unschedule('acc-employee-sync');
  end if;
end $$;
select cron.schedule('acc-employee-sync', '7 * * * *', 'select public.acc_notify_employee_sync()');

-- ตารางที่ติด trigger แล้ว (ต้องมีอย่างน้อย 1 แถว)
select event_object_schema as schema, event_object_table as "table"
from information_schema.triggers where trigger_name = 'acc_employee_sync' group by 1, 2;

-- ยกเลิก:
--   select cron.unschedule('acc-employee-sync');
--   drop trigger acc_employee_sync on <schema>.<table>;   (ตามตารางที่แสดงข้างบน)
