-- ============================================================================
-- 2026-10-01 — three holes found in a review of the signature flow.
--
--   1) Lost update. sign_document / assign_signers / unsign_document each read
--      the whole signatures array into a variable and then write it back. Two
--      people acting on the same document within the same moment both read the
--      old array, and the second write erases the first — a stamped signature
--      could disappear with a success message on both screens. The reads now
--      take a row lock (for update), so the second one waits and sees the first
--      one's result.
--
--   2) unsign_document DELETED the line instead of emptying it. A document with
--      3 signatures, one taken back off, was left with 2 entries both "signed",
--      so every screen called it เซ็นครบ while the paper had a blank line and
--      nobody was waiting to sign it. The line now returns to "รอเซ็น" for the
--      same person (the owner can still cancel or reassign).
--
--   3) The signed-content lock covered header/items/totals but not attachments,
--      so the receipt behind an approved document could still be swapped or
--      deleted. Attachments are now part of what a signature freezes.
--
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

-- 1 + the empty-array case: jsonb_agg over no rows returns NULL, and the column
-- is NOT NULL, so cancelling a request while a signer had the page open raised a
-- raw constraint error instead of the intended message.
create or replace function sign_document(sub_id uuid, block_id text) returns void
language plpgsql security definer set search_path = public as $$
declare r submissions; me profiles;
begin
  select * into r from submissions where id = sub_id for update;
  if not found then raise exception 'not found'; end if;
  select * into me from profiles where uid = auth.uid();
  if me."signatureImage" is null then raise exception 'no signature uploaded'; end if;
  update submissions set signatures = (
    select coalesce(jsonb_agg(
      case when e->>'blockId' = block_id and e->>'assignedUid' = auth.uid()::text and e->>'status' = 'pending'
        then e || jsonb_build_object('status', 'signed', 'signatureImage', me."signatureImage", 'signedAt', (extract(epoch from now()) * 1000)::bigint)
        else e end), '[]'::jsonb)
    from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
  ) where id = sub_id;
  if not exists (
    select 1 from jsonb_array_elements((select signatures from submissions where id = sub_id)) e
    where e->>'blockId' = block_id and e->>'assignedUid' = auth.uid()::text and e->>'status' = 'signed'
  ) then raise exception 'not assigned to sign this block'; end if;
end $$;

create or replace function assign_signers(sub_id uuid, assignments jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r submissions;
begin
  select * into r from submissions where id = sub_id for update;
  if not found then raise exception 'not found'; end if;
  if r."createdBy" <> auth.uid() then raise exception 'only the creator can assign signers'; end if;
  update submissions set signatures = (
    select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select e as x from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e where e->>'status' = 'signed'
      union all
      select jsonb_build_object(
               'blockId', a->>'blockId',
               'blockLabel', a->>'blockLabel',
               'assignedUid', a->>'assignedUid',
               'assignedName', a->>'assignedName',
               'status', 'pending') as x
        from jsonb_array_elements(coalesce(assignments, '[]'::jsonb)) a
        where a->>'blockId' not in (
          select s->>'blockId' from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) s where s->>'status' = 'signed'
        )
    ) q
  ) where id = sub_id;
end $$;

-- 2) Take the signature off, keep the line waiting for that person.
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

-- 3) A signature freezes the receipts as well as the numbers.
create or replace function protect_signed_content() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from jsonb_array_elements(coalesce(old.signatures, '[]'::jsonb)) e
    where e->>'status' = 'signed'
  ) and (new.header is distinct from old.header
      or new.items is distinct from old.items
      or new.totals is distinct from old.totals
      or new.attachments is distinct from old.attachments) then
    raise exception 'เอกสารนี้มีลายเซ็นแล้ว แก้ไขไม่ได้ — ลบลายเซ็นออกก่อนจึงจะแก้ได้';
  end if;
  return new;
end $$;
drop trigger if exists protect_signed on submissions;
create trigger protect_signed before update on submissions
  for each row execute function protect_signed_content();

-- Let the API see the changes right away.
notify pgrst, 'reload schema';
