-- สถานะเอกสารอัปเดตเองแบบ real time (src/shared/liveSubmissions.ts)
-- ย้อนกลับได้ด้วย supabase/rollback/2026-11-25-undo-realtime-submissions.sql · รันซ้ำได้
--
-- เพิ่มตาราง submissions เข้า publication supabase_realtime เพื่อให้หน้าเว็บรู้ทันทีเมื่อเอกสารเปลี่ยน
-- (ผู้อนุมัติเซ็น · ส่งให้เซ็น · ยกเลิก) แล้วโหลดรายการใหม่เอง ไม่ต้องกดรีเฟรช
-- Realtime ส่งให้แต่ละคนเฉพาะแถวที่คนนั้นมีสิทธิ์เห็นตาม RLS เดิม — ไม่มีข้อมูลรั่วไปหาคนอื่น
-- ไม่แตะข้อมูลหรือโครงสร้างตาราง

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
end $$;
