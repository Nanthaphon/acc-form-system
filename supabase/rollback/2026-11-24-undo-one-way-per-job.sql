-- ย้อนกลับ: 2026-11-24b-one-way-per-job.sql
-- รันในโปรเจค Acc Documents
--   1. คืนคำของป้ายสถานะ 3 คำที่เอาออก (ค่าเดิมทุกอย่าง รวม id)
--   2. เอากฎ "ผู้เบิกเซ็นได้เฉพาะช่องของผู้เบิก" ออกจากฐานข้อมูล

begin;

insert into field_options (id, field, value, "sortOrder", "createdAt") values
  ('29a906d0-4ae0-448f-a6e5-c1fd83c5fc1b', 'docStatus', 'เอกสารผิด', 1, 1795167532305),
  ('ca6176d3-3bed-44d3-a045-31c4c4215c05', 'docStatus', 'ไม่ได้ใช้', 2, 1795167532305),
  ('fbcfc693-da56-452c-a367-a7753abe8e9b', 'docStatus', 'ยกเลิกการใช้งาน', 3, 1795167532305)
on conflict (id) do nothing;

drop trigger if exists forbid_self_approval on submissions;
drop function if exists forbid_self_approval();

commit;

notify pgrst, 'reload schema';
