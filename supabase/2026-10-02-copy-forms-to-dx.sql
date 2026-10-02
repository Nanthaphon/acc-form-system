-- ============================================================================
-- 2026-10-02 — copy every form in the folder "เบิกค่าใช้จ่าย" into the folder
-- "เบิกค่าใช้จ่าย (DX)".
--
-- Each copy is a NEW form: it gets its own formType (so its documents and its
-- running number are its own) and keeps everything else exactly as it is —
-- columns, categories, notes, texts, signature blocks, access groups, the lot.
-- Copying through to_jsonb means a column added later is copied too, without
-- anyone having to remember to update this script.
--
-- Documents already filled in are NOT touched: they stay with the original
-- forms in the original folder.
--
-- Run in Supabase → SQL Editor. Safe to re-run: a form whose name is already in
-- the target folder is skipped, so running it twice does not double anything.
-- ============================================================================

with src as (
  select id from form_groups where name = 'เบิกค่าใช้จ่าย' order by "sortOrder", "createdAt" limit 1
), dst as (
  select id from form_groups where name = 'เบิกค่าใช้จ่าย (DX)' order by "sortOrder", "createdAt" limit 1
), first_group as (
  select id from form_groups order by "sortOrder", "createdAt" limit 1
)
insert into form_settings
select (jsonb_populate_record(
          null::form_settings,
          to_jsonb(f) || jsonb_build_object(
            'formType', gen_random_uuid()::text,
            'groupId', (select id from dst),
            'createdAt', (extract(epoch from now()) * 1000)::bigint,
            'updatedAt', (extract(epoch from now()) * 1000)::bigint
          )
        )).*
from form_settings f
where (select id from dst) is not null
  -- forms saved before folders existed have no groupId and belong to the first folder
  and coalesce(f."groupId", (select id from first_group)) = (select id from src)
  and not exists (
    select 1 from form_settings x
    where x."groupId" = (select id from dst) and x.name = f.name
  );

-- What the target folder holds now.
select g.name as folder, f.name as form, f."formCode", f.active
from form_settings f
join form_groups g on g.id = f."groupId"
where g.name = 'เบิกค่าใช้จ่าย (DX)'
order by f.name;
