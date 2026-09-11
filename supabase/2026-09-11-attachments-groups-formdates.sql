-- ============================================================================
-- 2026-09-11 — file attachments, several access groups per form, form dates.
-- Run once in Supabase → SQL Editor BEFORE deploying the matching app version
-- (the app writes these columns when saving). Safe to re-run.
-- ============================================================================

-- 1) Attachments -------------------------------------------------------------
alter table submissions add column if not exists attachments jsonb not null default '[]';

-- Private bucket. The 5 MB per-file cap is enforced here as well; the app also
-- checks 5 files / 25 MB per document before uploading anything.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;

-- Objects are stored as <submissionId>/<file>. Access follows the parent
-- document: the subqueries run under submissions' own RLS, so they only match
-- documents the caller may already see (owner, admin, or an assigned signer).
drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and exists (
    select 1 from public.submissions s where s.id::text = (storage.foldername(name))[1]));

-- Adding or removing files: the document's owner or an admin only.
drop policy if exists attachments_insert on storage.objects;
create policy attachments_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and exists (
    select 1 from public.submissions s where s.id::text = (storage.foldername(name))[1]
      and (s."createdBy" = auth.uid() or public.is_admin())));

drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and exists (
    select 1 from public.submissions s where s.id::text = (storage.foldername(name))[1]
      and (s."createdBy" = auth.uid() or public.is_admin())));

-- 2) A form can be shown to several access groups ----------------------------
alter table form_settings add column if not exists "accessGroups" jsonb not null default '[]';
-- Carry each form's old single group over into the new list (once).
update form_settings
   set "accessGroups" = jsonb_build_array("accessGroup"), "accessGroup" = null
 where "accessGroup" is not null and "accessGroup" <> '' and "accessGroups" = '[]'::jsonb;

-- 3) Created / modified dates for sorting the form list ----------------------
alter table form_settings add column if not exists "createdAt" bigint not null default 0;
alter table form_settings add column if not exists "updatedAt" bigint not null default 0;
-- Existing forms start from "now" (their real dates were never recorded).
update form_settings set "createdAt" = (extract(epoch from now()) * 1000)::bigint where "createdAt" = 0;
update form_settings set "updatedAt" = "createdAt" where "updatedAt" = 0;
