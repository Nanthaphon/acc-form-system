-- ข้อมูลพนักงานจากระบบกลาง (report.employees ของโปรเจค it-asset-management)
-- รันในโปรเจค Acc Documents · รันซ้ำได้ · ดูขั้นตอนทั้งหมดที่ docs/central-employees.md
--
-- edge function sync-employees คัดลอก ชื่อ นามสกุล ตำแหน่ง แผนก บริษัท อีเมล
-- จากระบบกลางมาใส่ profiles ที่รหัสพนักงานตรงกัน แล้วจด:
--   "centralFields"   ช่องที่ระบบกลางเป็นเจ้าของ (แก้ในระบบนี้ไม่ได้)
--   "centralStatus"   active / resigned / missing (ไม่พบในระบบกลาง)
--   "centralSyncedAt" ซิงก์ล่าสุด (ms)

alter table profiles add column if not exists "centralFields" text[] not null default '{}';
alter table profiles add column if not exists "centralStatus" text;
alter table profiles add column if not exists "centralSyncedAt" bigint;

-- ช่องที่มาจากระบบกลาง แก้ได้เฉพาะการซิงก์ (service role / SQL Editor ไม่มีผู้ใช้ล็อกอิน)
create or replace function protect_central_fields() returns trigger language plpgsql as $$
declare f text;
begin
  if auth.uid() is null then return new; end if;
  if new."centralFields" is distinct from old."centralFields"
     or new."centralStatus" is distinct from old."centralStatus"
     or new."centralSyncedAt" is distinct from old."centralSyncedAt" then
    raise exception 'CENTRAL_FIELD:sync';
  end if;
  foreach f in array coalesce(old."centralFields", '{}') loop
    if to_jsonb(new) -> f is distinct from to_jsonb(old) -> f then
      raise exception 'CENTRAL_FIELD:%', f;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists protect_central on profiles;
create trigger protect_central before update on profiles
  for each row execute function protect_central_fields();

-- ประวัติการซิงก์ (แอดมินอ่านได้ · เขียนได้เฉพาะ edge function)
create table if not exists employee_sync_runs (
  id bigserial primary key,
  "ranAt" bigint not null,
  "by" text not null default '',
  ok boolean not null default true,
  summary jsonb not null default '{}'
);
alter table employee_sync_runs enable row level security;
drop policy if exists employee_sync_runs_select on employee_sync_runs;
create policy employee_sync_runs_select on employee_sync_runs for select using (is_admin());

notify pgrst, 'reload schema';
