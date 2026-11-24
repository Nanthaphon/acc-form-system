-- ลายเซ็นของใคร คนนั้นจัดการเองคนเดียว · ย้อนกลับได้ด้วย supabase/rollback/2026-11-24-undo-own-signature-only.sql
-- รันในโปรเจค Acc Documents หลัง 2026-11-24b-one-way-per-job.sql · รันซ้ำได้
--
-- เดิม: เจ้าของเอกสาร (ผู้เบิก) ลบลายเซ็นของทุกคนในเอกสารได้ และ "ยกเลิกการส่งให้เซ็น"
-- ล้างลายเซ็นทุกช่อง แม้ผู้อนุมัติเซ็นไปแล้ว — ลายเซ็นอนุมัติหายไปเงียบ ๆ แล้วแก้เอกสารได้โดยไม่มีฉบับ R1
--
-- ตอนนี้:
-- 1. unsign_document — ลบได้เฉพาะลายเซ็นของตัวเอง
-- 2. cancel_signing  — ยกเลิกการส่งได้เมื่อยังไม่มีคนอื่นเซ็น (ลายเซ็นของผู้เบิกเองล้างได้ตามเดิม)
-- 3. protect_others_signatures — ด่านสุดท้ายที่ตาราง: ลายเซ็นของคนอื่นที่เซ็นแล้ว แก้หรือเอาออกไม่ได้
--    ไม่ว่าทางไหน (API ตรง ๆ ก็ไม่ได้) · ลบเอกสารที่คนอื่นเซ็นแล้วได้เฉพาะแอดมิน
--    ยกเลิกเอกสาร / กู้คืน ยังทำงานได้ เพราะลายเซ็นที่เซ็นแล้วอยู่ครบเหมือนเดิม
--    SQL Editor และงานของระบบ (auth.uid() ว่าง) ไม่ถูกกฎนี้

begin;

create or replace function unsign_document(sub_id uuid, block_id text) returns void
language plpgsql security definer set search_path = public as $$
declare r submissions;
begin
  select * into r from submissions where id = sub_id for update;
  if not found then raise exception 'not found'; end if;

  if not exists (
    select 1 from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
    where e->>'blockId' = block_id
      and e->>'status' = 'signed'
      and e->>'assignedUid' = auth.uid()::text
  ) then
    raise exception 'SIGNED_BY_OTHERS';
  end if;

  update submissions set signatures = (
    select coalesce(jsonb_agg(
      case when e->>'blockId' = block_id
        then (e - 'signatureImage' - 'signedAt') || jsonb_build_object('status', 'pending')
        else e end), '[]'::jsonb)
    from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
  ) where id = sub_id;
end $$;

create or replace function cancel_signing(sub_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r submissions;
begin
  select * into r from submissions where id = sub_id for update;
  if not found or r."createdBy" <> auth.uid() then raise exception 'cannot cancel signing'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
    where e->>'status' = 'signed' and e->>'assignedUid' <> r."createdBy"::text
  ) then
    raise exception 'SIGNED_BY_OTHERS';
  end if;
  update submissions set signatures = '[]'::jsonb where id = sub_id;
end $$;

create or replace function protect_others_signatures() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return coalesce(new, old); end if;   -- SQL Editor / งานของระบบ
  if tg_op = 'DELETE' then
    if not is_admin() and exists (
      select 1 from jsonb_array_elements(coalesce(old.signatures, '[]'::jsonb)) e
      where e->>'status' = 'signed' and e->>'assignedUid' <> auth.uid()::text
    ) then
      raise exception 'SIGNED_BY_OTHERS';
    end if;
    return old;
  end if;
  -- ทุกลายเซ็นของคนอื่นที่เซ็นแล้ว ต้องยังอยู่ครบเหมือนเดิม
  if exists (
    select 1 from jsonb_array_elements(coalesce(old.signatures, '[]'::jsonb)) e
    where e->>'status' = 'signed' and e->>'assignedUid' <> auth.uid()::text
      and not exists (select 1 from jsonb_array_elements(coalesce(new.signatures, '[]'::jsonb)) n where n = e)
  ) then
    raise exception 'SIGNED_BY_OTHERS';
  end if;
  return new;
end $$;

drop trigger if exists protect_others_signatures on submissions;
create trigger protect_others_signatures before update of signatures or delete on submissions
  for each row execute function protect_others_signatures();

commit;

notify pgrst, 'reload schema';
