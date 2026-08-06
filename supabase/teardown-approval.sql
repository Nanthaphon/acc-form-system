-- ============================================================================
-- ONLINE APPROVAL FEATURE — teardown
-- Run this to remove EVERYTHING the online-approval feature added, returning
-- the database to its pre-feature state (pair with `git checkout
-- feat/expense-form-mvp` to remove the code). Safe to run repeatedly.
-- ============================================================================

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
