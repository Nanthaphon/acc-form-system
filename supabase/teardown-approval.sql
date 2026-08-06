-- ============================================================================
-- ONLINE APPROVAL FEATURE — teardown
-- Run this to remove EVERYTHING the online-approval feature added, returning
-- the database to its pre-feature state (pair with `git checkout
-- feat/expense-form-mvp` to remove the code). Safe to run repeatedly.
-- ============================================================================

-- ---- Slice 3: Approval workflow --------------------------------------------
drop trigger if exists protect_submission on submissions;
drop function if exists protect_submission_content();
drop function if exists request_approval(uuid);
drop function if exists approve_submission(uuid);
drop function if exists reject_submission(uuid, text);
drop policy if exists submissions_approver_select on submissions;
drop function if exists is_approver_for(text);
alter table submissions drop column if exists status;
alter table submissions drop column if exists "departmentId";
alter table submissions drop column if exists "requestedAt";
alter table submissions drop column if exists "approvedBy";
alter table submissions drop column if exists "approvedByName";
alter table submissions drop column if exists "approverSignature";
alter table submissions drop column if exists "approvedAt";
alter table submissions drop column if exists "rejectReason";

-- ---- Slice 2: Approvers ----------------------------------------------------
drop trigger if exists protect_approver on profiles;
drop function if exists protect_approver_fields();
alter table profiles drop column if exists "canApprove";
alter table profiles drop column if exists "approverAllDepartments";
alter table profiles drop column if exists "approverDepartments";
alter table profiles drop column if exists "signatureImage";

-- ---- Slice 1: Departments --------------------------------------------------
drop table if exists departments cascade;
alter table profiles drop column if exists "departmentId";
