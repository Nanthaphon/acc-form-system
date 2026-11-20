-- ซิงก์ข้อมูลพนักงานจาก it-asset อัตโนมัติ ทุก 10 นาที
-- รันในโปรเจค Acc Documents (wrujttmqawcvcrqqhcno) เท่านั้น · รันซ้ำได้
-- (อยู่ในโฟลเดอร์ manual: ไม่ถูกรวมเข้าฐานข้อมูลทดสอบ เพราะเรียก URL ของระบบจริง)
--
-- บรรทัดสุดท้ายแสดงค่า SYNC_SECRET — ก๊อปไปใส่ใน Edge Functions → Secrets ชื่อ SYNC_SECRET

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- รหัสลับที่งานอัตโนมัติใช้เรียก function (ไม่ต้องใช้ service role key)
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'employee_sync_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'employee_sync_secret',
      'x-sync-secret ของ edge function sync-employees');
  end if;
end $$;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'sync-employees') then
    perform cron.unschedule('sync-employees');
  end if;
end $$;

select cron.schedule('sync-employees', '*/10 * * * *', $job$
  select net.http_post(
    url := 'https://wrujttmqawcvcrqqhcno.supabase.co/functions/v1/sync-employees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'employee_sync_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

select decrypted_secret as "SYNC_SECRET" from vault.decrypted_secrets where name = 'employee_sync_secret';

-- หยุดซิงก์อัตโนมัติ:  select cron.unschedule('sync-employees');
