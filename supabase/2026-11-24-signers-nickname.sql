-- รายชื่อผู้เซ็น ส่งชื่อเล่นมาด้วย เพื่อให้ช่อง "พิมพ์ค้นหาผู้เซ็น" ค้นจากชื่อเล่นได้
-- รันในโปรเจค Acc Documents หลัง 2026-11-20d-employee-nickname.sql · รันซ้ำได้
-- (คอลัมน์ที่ส่งออกเปลี่ยน จึงต้องลบฟังก์ชันเดิมแล้วสร้างใหม่ — สิทธิ์เรียกใช้เหมือนเดิม)

-- One transaction: nobody calling it in between finds it missing.
begin;

drop function if exists list_signers();
create function list_signers() returns table(uid uuid, name text, nickname text)
language sql security definer stable set search_path = public as $$
  select uid, trim("firstName" || ' ' || "lastName") as name, coalesce(nickname, '') as nickname
  from profiles order by "firstName", "lastName"
$$;

revoke all on function list_signers() from public, anon;
grant execute on function list_signers() to authenticated;

commit;

notify pgrst, 'reload schema';
