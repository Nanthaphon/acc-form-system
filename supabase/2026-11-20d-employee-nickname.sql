-- ชื่อเล่นพนักงาน (ซิงก์จาก it-asset · แก้ใน Acc ได้)
-- รันในโปรเจค Acc Documents · รันซ้ำได้

alter table profiles add column if not exists nickname text not null default '';

notify pgrst, 'reload schema';
