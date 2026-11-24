-- ย้อนกลับ: เอาระบบ "ยกเลิกเอกสาร / ฉบับแก้ไข R1" ออก (กลับเป็นก่อนรัน 2026-10-28-void-documents.sql)
-- รันในโปรเจค Acc Documents
--
-- ⚠ เอกสารที่ถูกยกเลิกหรือแก้เป็น R1 หลังติดตั้ง จะกลับมาเป็นเอกสารธรรมดา (ข้อมูลการยกเลิกหายไป)
--   ถ้าอยากเก็บข้อมูลนั้นไว้ ให้ลบ 2 บรรทัด "alter table ... drop column" ออกก่อนรัน
--   (แต่ระบบจะยังเห็นคอลัมน์ และแสดงปุ่มยกเลิกที่กดแล้วไม่ทำงาน)

begin;

drop trigger if exists protect_voided on submissions;
drop function if exists protect_voided();
drop trigger if exists clean_new_submission on submissions;
drop function if exists clean_new_submission();
drop function if exists void_submission(uuid, text, uuid);
drop function if exists unvoid_submission(uuid);

-- นโยบายลบไฟล์แนบ: กลับเป็นแบบเดิม (เจ้าของเอกสารหรือแอดมินลบได้)
drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects for delete to authenticated
  using ((bucket_id = 'attachments'::text) and (exists (select 1 from submissions s
    where (((s.id)::text = (storage.foldername(objects.name))[1]) and ((s."createdBy" = auth.uid()) or is_admin())))));

alter table submissions drop column if exists voided;
alter table submissions drop column if exists replaces;

commit;

notify pgrst, 'reload schema';
