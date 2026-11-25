-- ย้อนคืน supabase/2026-11-25-realtime-submissions.sql — เอา submissions ออกจาก realtime
-- หน้าเว็บยังทำงานได้ปกติ แค่ต้องสลับแท็บหรือรีเฟรชเพื่อเห็นสถานะใหม่

do $$
begin
  if exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime drop table public.submissions;
  end if;
end $$;
