-- ============================================================================
-- ข้อมูลตั้งต้นของฐานข้อมูลในเครื่อง (supabase start / npm run local:reset)
--
-- รันอัตโนมัติหลัง migrations — ใช้เฉพาะเครื่องตัวเอง ไม่มีผลกับ staging หรือ
-- ระบบจริง (ที่นั่นไม่มีใครรันไฟล์นี้)
--
-- สร้างบัญชีผู้ดูแลระบบไว้ให้ล็อกอินได้ทันที
--   ชื่อผู้ใช้  admin
--   รหัสผ่าน   admin1234
-- ============================================================================

-- บัญชีเข้าสู่ระบบ (auth.users) — รหัสผ่านเข้ารหัสด้วย pgcrypto เหมือนที่ Supabase ทำ
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'admin@globe.local', crypt('admin1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
where not exists (select 1 from auth.users where email = 'admin@globe.local');

-- ข้อมูลพนักงานของบัญชีนั้น (ระบบอ่าน role จากตารางนี้)
insert into profiles (uid, "employeeId", "firstName", "lastName", position, role, "mustChangePassword")
select id, 'admin', 'ผู้ดูแล', 'ในเครื่อง', 'IT', 'admin', false
from auth.users where email = 'admin@globe.local'
on conflict (uid) do nothing;

-- พนักงานทดสอบอีกคน ไว้ลองส่งเซ็น (ล็อกอิน: emp01 / admin1234)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'emp01@globe.local', crypt('admin1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
where not exists (select 1 from auth.users where email = 'emp01@globe.local');

insert into profiles (uid, "employeeId", "firstName", "lastName", position, role, "mustChangePassword")
select id, 'emp01', 'สมชาย', 'ทดสอบ', 'พนักงาน', 'employee', false
from auth.users where email = 'emp01@globe.local'
on conflict (uid) do nothing;
