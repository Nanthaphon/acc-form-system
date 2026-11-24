-- แต่ละเรื่องมีทางเดียว · ย้อนกลับได้ด้วย supabase/rollback/2026-11-24-undo-one-way-per-job.sql
-- รันในโปรเจค Acc Documents หลัง 2026-10-28-void-documents.sql · รันซ้ำได้
--
-- 1. ป้ายสถานะของแอดมิน มีไว้จดโน้ตเท่านั้น: เอาคำที่ซ้ำกับระบบยกเลิกเอกสารออก
--    (เอกสารผิดหลังเซ็น → แก้ไขเป็นฉบับใหม่ R1 · ไม่ใช้แล้ว → ยกเลิกเอกสาร)
--    เอกสารที่ติดป้ายเหล่านี้อยู่แล้ว ป้ายยังอยู่เหมือนเดิม
-- 2. ผู้เบิกเซ็นได้เฉพาะช่องของผู้เบิก (requester) ในเอกสารของตัวเอง
--    ช่องอื่น (หัวหน้า ผู้อนุมัติ ฝ่ายบัญชี …) ต้องเป็นคนอื่นเซ็น
--    ลายเซ็นที่มีอยู่แล้วไม่ถูกแตะ — กฎนี้ห้ามเฉพาะการใส่ใหม่

begin;

delete from field_options
 where field = 'docStatus' and value in ('เอกสารผิด', 'ไม่ได้ใช้', 'ยกเลิกการใช้งาน');

create or replace function forbid_self_approval() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- SQL Editor / งานของระบบ
  if exists (
    select 1 from jsonb_array_elements(coalesce(new.signatures, '[]'::jsonb)) e
    where e->>'assignedUid' = new."createdBy"::text
      and coalesce(e->>'blockId', '') <> 'requester'
      -- ของเดิมที่ไม่เปลี่ยน ปล่อยผ่าน (เอกสารที่เซ็นเองไว้ก่อนมีกฎนี้)
      and not exists (select 1 from jsonb_array_elements(coalesce(old.signatures, '[]'::jsonb)) o where o = e)
  ) then
    raise exception 'SELF_APPROVAL';
  end if;
  return new;
end $$;

drop trigger if exists forbid_self_approval on submissions;
create trigger forbid_self_approval before update of signatures on submissions
  for each row execute function forbid_self_approval();

commit;

notify pgrst, 'reload schema';
