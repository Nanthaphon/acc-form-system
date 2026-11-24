-- ย้อนคืน supabase/2026-11-24c-own-signature-only.sql
-- กลับเป็นแบบเดิม: เจ้าของเอกสารลบลายเซ็นของทุกคนได้ · ยกเลิกการส่งให้เซ็นล้างลายเซ็นทุกช่อง
-- (คัดลอกจากฟังก์ชันในฐานข้อมูลจริงก่อนแก้ 2026-11-24)

begin;

drop trigger if exists protect_others_signatures on submissions;
drop function if exists protect_others_signatures();

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
      and (e->>'assignedUid' = auth.uid()::text or r."createdBy" = auth.uid())
  ) then
    raise exception 'cannot remove this signature';
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
language plpgsql security definer as $$
begin
  update submissions set signatures = '[]'::jsonb where id = sub_id and "createdBy" = auth.uid();
  if not found then raise exception 'cannot cancel signing'; end if;
end $$;

commit;

notify pgrst, 'reload schema';
