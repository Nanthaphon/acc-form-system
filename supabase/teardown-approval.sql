-- ============================================================================
-- ONLINE APPROVAL FEATURE — teardown
-- Run this to remove EVERYTHING the online-approval feature added, returning
-- the database to its pre-feature state (pair with `git checkout
-- feat/expense-form-mvp` to remove the code). Safe to run repeatedly.
-- ============================================================================

-- ---- Slice 1: Departments --------------------------------------------------
drop table if exists departments cascade;
alter table profiles drop column if exists "departmentId";
