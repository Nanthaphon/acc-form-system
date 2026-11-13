-- ============================================================================
-- 2026-11-13 — สถานะของเอกสารที่ผู้ดูแลระบบตั้งเอง
--
-- The system's own status says where a document is in its life (บันทึกแล้ว /
-- รอลายเซ็น / เซ็นครบ / ยกเลิก). This is a second, plain note the admin puts on
-- a document in words the office uses — เอกสารผิด, ไม่ได้ใช้, รอตรวจสอบ — and
-- which the system does nothing with: nothing is locked, hidden or counted
-- differently because of it.
--
--   submissions."docStatus" text   -- null = ไม่ได้ตั้ง
--
-- The words themselves are rows in field_options (field = 'docStatus'), so the
-- admin adds and renames them on หน้า Custom Field without a developer.
--
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

alter table submissions add column if not exists "docStatus" text;

-- Only an admin sets it, and only through this function: the row itself stays
-- closed to the browser, as it is for everything else about a document.
create or replace function set_doc_status(sub_id uuid, status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'ตั้งสถานะได้เฉพาะผู้ดูแลระบบ';
  end if;
  if not exists (select 1 from submissions where id = sub_id) then
    raise exception 'ไม่พบเอกสาร';
  end if;
  update submissions
     set "docStatus" = nullif(trim(coalesce(status, '')), ''),
         "updatedAt" = (extract(epoch from now()) * 1000)::bigint
   where id = sub_id;
end $$;

revoke all on function set_doc_status(uuid, text) from public;
grant execute on function set_doc_status(uuid, text) to authenticated;

-- The words to choose from, if they are not there already. The admin may
-- rename, remove or add to them on หน้า Custom Field.
insert into field_options (id, field, value, "sortOrder")
select gen_random_uuid(), 'docStatus', v.value, v."sortOrder"
from (values ('เอกสารผิด', 1), ('ไม่ได้ใช้', 2), ('ยกเลิกการใช้งาน', 3), ('รอตรวจสอบ', 4)) as v(value, "sortOrder")
where not exists (select 1 from field_options where field = 'docStatus');

-- Check: the documents that carry a status, and what is on offer.
select "docNumber", "docStatus" from submissions where "docStatus" is not null order by "createdAt" desc limit 20;
select value from field_options where field = 'docStatus' order by "sortOrder";
