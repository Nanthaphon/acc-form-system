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

-- ---- 2) New: online signature assignments on a document ---------------------
-- Array of { blockId, blockLabel, assignedUid, assignedName, status, signatureImage?, signedAt? }
alter table submissions add column if not exists signatures jsonb not null default '[]';
