-- ============================================================================
-- SIGNATURE SYSTEM v2 (branch: feat/online-approval)
-- Replaces the old approval workflow (request → route by department → inbox →
-- approve/reject). This migration:
--   1) removes the old approval DB objects,
--   2) keeps profiles.signatureImage (saved signature, now used by everyone)
--      and the departments table (still used as employee info),
--   3) adds submissions.signatures for the new per-block online signatures.
-- Safe to run repeatedly.
-- ============================================================================

-- ---- 1) Remove the old approval system --------------------------------------
drop trigger if exists protect_submission on submissions;
drop function if exists protect_submission_content();
drop function if exists request_approval(uuid);
drop function if exists approve_submission(uuid);
drop function if exists reject_submission(uuid, text);
drop policy if exists submissions_approver_select on submissions;
drop function if exists is_approver_for(text);
drop trigger if exists protect_approver on profiles;
drop function if exists protect_approver_fields();

alter table profiles drop column if exists "canApprove";
alter table profiles drop column if exists "approverAllDepartments";
alter table profiles drop column if exists "approverDepartments";

alter table submissions drop column if exists status;
alter table submissions drop column if exists "departmentId";
alter table submissions drop column if exists "requestedAt";
alter table submissions drop column if exists "approvedBy";
alter table submissions drop column if exists "approvedByName";
alter table submissions drop column if exists "approverSignature";
alter table submissions drop column if exists "approvedAt";
alter table submissions drop column if exists "rejectReason";

-- Kept on purpose: profiles.signatureImage, profiles."departmentId", departments table.

-- ---- 2) New: configurable signature blocks on a form ------------------------
-- Array of { id, label, online }. Empty = fall back to the built-in 5 blocks.
alter table form_settings add column if not exists "signatureBlocks" jsonb not null default '[]';

-- ---- 3) New: online signature assignments on a document ---------------------
-- Array of { blockId, blockLabel, assignedUid, assignedName, status, signatureImage?, signedAt? }
alter table submissions add column if not exists signatures jsonb not null default '[]';

-- Everyone may read the list of possible signers (uid + name only, no sensitive fields).
create or replace function list_signers() returns table(uid uuid, name text) language sql security definer stable as $$
  select uid, trim("firstName" || ' ' || "lastName") as name from profiles order by "firstName", "lastName"
$$;

-- An assigned signer may read the documents they must sign.
create or replace function is_assigned_signer(sigs jsonb) returns boolean language sql stable as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(sigs, '[]'::jsonb)) e
    where e->>'assignedUid' = auth.uid()::text
  )
$$;
drop policy if exists submissions_signer_select on submissions;
create policy submissions_signer_select on submissions for select using (is_assigned_signer(signatures));

-- The document owner sets/updates signer assignments (already-signed blocks are kept).
create or replace function assign_signers(sub_id uuid, assignments jsonb) returns void language plpgsql security definer as $$
declare r submissions;
begin
  select * into r from submissions where id = sub_id;
  if not found then raise exception 'not found'; end if;
  if r."createdBy" <> auth.uid() then raise exception 'only the creator can assign signers'; end if;
  update submissions set signatures = (
    select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select e as x from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e where e->>'status' = 'signed'
      union all
      select a as x from jsonb_array_elements(coalesce(assignments, '[]'::jsonb)) a
        where a->>'blockId' not in (
          select s->>'blockId' from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) s where s->>'status' = 'signed'
        )
    ) q
  ) where id = sub_id;
end $$;

-- An assigned signer stamps their saved signature onto one block.
create or replace function sign_document(sub_id uuid, block_id text) returns void language plpgsql security definer as $$
declare r submissions; me profiles;
begin
  select * into r from submissions where id = sub_id;
  if not found then raise exception 'not found'; end if;
  select * into me from profiles where uid = auth.uid();
  if me."signatureImage" is null then raise exception 'no signature uploaded'; end if;
  update submissions set signatures = (
    select jsonb_agg(
      case when e->>'blockId' = block_id and e->>'assignedUid' = auth.uid()::text and e->>'status' = 'pending'
        then e || jsonb_build_object('status', 'signed', 'signatureImage', me."signatureImage", 'signedAt', (extract(epoch from now()) * 1000)::bigint)
        else e end)
    from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
  ) where id = sub_id;
  if not exists (
    select 1 from jsonb_array_elements((select signatures from submissions where id = sub_id)) e
    where e->>'blockId' = block_id and e->>'assignedUid' = auth.uid()::text and e->>'status' = 'signed'
  ) then raise exception 'not assigned to sign this block'; end if;
end $$;
