-- ============================================================================
-- 2026-10-28 — ยกเลิกเอกสาร / ออกฉบับแก้ไข
--
-- A document that was signed and found wrong used to be copied, corrected and
-- saved again, leaving the wrong one beside the right one with nothing to tell
-- them apart. A document can now be cancelled (voided) instead: it stays in the
-- system as a record, marked ยกเลิก with who, when and why, and — when it was
-- corrected — which new document replaces it. The new one points back to it.
--
--   submissions.voided   {at, byUid, byName, reason, replacedById?, replacedByNumber?}
--   submissions.replaces {id, docNumber} — on the corrected document
--
-- Both are written only by the functions below, never by the browser directly.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

alter table submissions add column if not exists voided jsonb;
alter table submissions add column if not exists replaces jsonb;

-- Cancel a document. The owner or an admin; a reason is required. With
-- `replaced_by`, the new document (the same owner's) is linked both ways.
-- Anyone still waiting to sign is let off — their lines are taken off and
-- kept in voided.pending, so bringing the document back puts them back; the
-- signatures already on it stay, as part of the record.
create or replace function void_submission(sub_id uuid, reason text, replaced_by uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare r submissions; n submissions; me profiles;
begin
  select * into r from submissions where id = sub_id for update;
  if not found then raise exception 'ไม่พบเอกสาร'; end if;
  if r."createdBy" <> auth.uid() and not is_admin() then
    raise exception 'ยกเลิกได้เฉพาะเจ้าของเอกสารหรือผู้ดูแลระบบ';
  end if;
  if r.voided is not null then raise exception 'เอกสารนี้ถูกยกเลิกไปแล้ว'; end if;
  if coalesce(trim(reason), '') = '' then raise exception 'ต้องระบุเหตุผลที่ยกเลิก'; end if;

  if replaced_by is not null then
    select * into n from submissions where id = replaced_by for update;
    if not found or n."createdBy" <> r."createdBy" or n.id = r.id then
      raise exception 'ไม่พบฉบับแก้ไขของเอกสารนี้';
    end if;
    -- A replacement must be live, and not already the correction of another.
    if n.voided is not null then raise exception 'ฉบับแก้ไขถูกยกเลิกไปแล้ว'; end if;
    if n.replaces is not null and n.replaces->>'id' <> r.id::text then
      raise exception 'ฉบับแก้ไขนี้เป็นฉบับแก้ไขของเอกสารอื่นอยู่แล้ว';
    end if;
    update submissions set replaces = jsonb_build_object('id', r.id, 'docNumber', r."docNumber")
      where id = n.id;
  end if;

  select * into me from profiles where uid = auth.uid();
  update submissions set
    voided = jsonb_build_object(
        'at', (extract(epoch from now()) * 1000)::bigint,
        'byUid', auth.uid(),
        'byName', trim(coalesce(me."firstName", '') || ' ' || coalesce(me."lastName", '')),
        'reason', trim(reason),
        'pending', (select coalesce(jsonb_agg(e), '[]'::jsonb)
                    from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
                    where e->>'status' <> 'signed'))
      || case when n.id is not null
           then jsonb_build_object('replacedById', n.id, 'replacedByNumber', n."docNumber")
           else '{}'::jsonb end,
    signatures = (
      select coalesce(jsonb_agg(e), '[]'::jsonb)
      from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
      where e->>'status' = 'signed')
  where id = sub_id;
end $$;

-- Cancelled by mistake: an admin can bring it back as it was — the lines that
-- were waiting to be signed wait again, and a correction made from it no
-- longer claims to replace it.
create or replace function unvoid_submission(sub_id uuid) returns void
language plpgsql security definer set search_path = public as $
declare r submissions;
begin
  if not is_admin() then raise exception 'กู้คืนได้เฉพาะผู้ดูแลระบบ'; end if;
  select * into r from submissions where id = sub_id for update;
  if not found then raise exception 'ไม่พบเอกสาร'; end if;
  if r.voided is null then return; end if;
  update submissions set
    voided = null,
    signatures = coalesce(r.signatures, '[]'::jsonb) || coalesce(r.voided->'pending', '[]'::jsonb)
  where id = sub_id;
  update submissions set replaces = null
   where replaces->>'id' = sub_id::text;
end $;

revoke all on function void_submission(uuid, text, uuid) from public, anon;
revoke all on function unvoid_submission(uuid) from public, anon;
grant execute on function void_submission(uuid, text, uuid) to authenticated;
grant execute on function unvoid_submission(uuid) to authenticated;

-- A cancelled document is a record: its content, files and signatures stay as
-- they were (bringing it back with unvoid_submission is the only change).
create or replace function protect_voided() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.voided is not null and new.voided is not null and (
       new.header is distinct from old.header
    or new.items is distinct from old.items
    or new.totals is distinct from old.totals
    or new.attachments is distinct from old.attachments
    or new.signatures is distinct from old.signatures) then
    raise exception 'เอกสารนี้ถูกยกเลิกแล้ว แก้ไขหรือส่งเซ็นไม่ได้';
  end if;
  return new;
end $$;
drop trigger if exists protect_voided on submissions;
create trigger protect_voided before update on submissions
  for each row execute function protect_voided();

-- A new document starts as a new document. The column grants (2026-09-18)
-- only cover UPDATE, so an INSERT straight to the API could arrive already
-- signed — with a colleague's signature image — already cancelled, linked to
-- someone else's document, or printed. Whatever the browser sends, those
-- start empty; signatures only ever arrive through sign_document.
create or replace function clean_new_submission() returns trigger
language plpgsql set search_path = public as $
begin
  if auth.uid() is null then return new; end if;   -- SQL Editor / service jobs
  new.signatures := '[]'::jsonb;
  new.voided := null;
  new.replaces := null;
  new."printCount" := 0;
  new."lastPrintedAt" := null;
  return new;
end $;
drop trigger if exists clean_new_submission on submissions;
create trigger clean_new_submission before insert on submissions
  for each row execute function clean_new_submission();

-- The receipts behind a signed or cancelled document stay with it: the
-- attachments list is locked (protect_signed_content / protect_voided), and
-- now so are the files. The owner removes files only while nobody has signed;
-- an admin still can, so deleting a document never leaves its files behind.
drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and exists (
    select 1 from public.submissions s where s.id::text = (storage.foldername(name))[1]
      and (public.is_admin() or (
        s."createdBy" = auth.uid() and s.voided is null
        and not exists (select 1 from jsonb_array_elements(coalesce(s.signatures, '[]'::jsonb)) e
                        where e->>'status' = 'signed')))));

-- Let the API see the changes right away.
notify pgrst, 'reload schema';
