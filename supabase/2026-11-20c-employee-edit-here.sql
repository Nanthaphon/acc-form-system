-- แก้ข้อมูลพนักงานใน Acc Documents ได้ (ไม่ส่งกลับไป it-asset)
-- รันในโปรเจค Acc Documents หลัง 2026-11-20-central-employees.sql · รันซ้ำได้
--
-- เดิม: ช่องที่มาจาก it-asset ล็อก แก้ในระบบนี้ไม่ได้
-- ใหม่: แก้ได้ทุกช่อง · การซิงก์จะเขียนทับช่องไหนก็ต่อเมื่อ it-asset เปลี่ยนค่าช่องนั้นจริง
--       ("centralValues" จำค่าของ it-asset ที่ซิงก์ครั้งล่าสุดเห็น ไว้เทียบ)

alter table profiles add column if not exists "centralValues" jsonb;

-- ค่าปัจจุบันของคนที่ซิงก์แล้ว ตรงกับ it-asset อยู่แล้ว → ใช้เป็นจุดเริ่ม
update profiles p
set "centralValues" = (
  select jsonb_object_agg(f, to_jsonb(p) ->> f)
  from unnest(p."centralFields") as f
)
where "centralValues" is null and cardinality("centralFields") > 0;

-- ยังกันไม่ให้ผู้ใช้แก้สถานะการซิงก์เอง แต่ไม่ล็อกช่องข้อมูลอีกแล้ว
create or replace function protect_central_fields() returns trigger language plpgsql as $$
begin
  if auth.uid() is null then return new; end if;
  if new."centralFields" is distinct from old."centralFields"
     or new."centralStatus" is distinct from old."centralStatus"
     or new."centralSyncedAt" is distinct from old."centralSyncedAt"
     or new."centralValues" is distinct from old."centralValues" then
    raise exception 'CENTRAL_FIELD:sync';
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
