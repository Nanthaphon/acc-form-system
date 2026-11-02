-- ============================================================================
-- 2026-11-02 — โฟลเดอร์ย่อย: a folder on the first page can hold folders of
-- its own, one level deep (a folder inside a sub-folder is refused).
--
--   form_groups."parentId"  null = a folder on the first page
--
-- Run once in Supabase → SQL Editor. Safe to re-run. Until it is run the app
-- works as before and offers no sub-folders.
-- ============================================================================

alter table form_groups add column if not exists "parentId" text
  references form_groups(id) on delete restrict;
create index if not exists form_groups_parent on form_groups ("parentId");

create or replace function form_groups_one_level() returns trigger
language plpgsql as $$
begin
  if new."parentId" is null then return new; end if;
  if new."parentId" = new.id then raise exception 'โฟลเดอร์อยู่ในตัวเองไม่ได้'; end if;
  if exists (select 1 from form_groups where id = new."parentId" and "parentId" is not null) then
    raise exception 'สร้างโฟลเดอร์ย่อยได้ชั้นเดียว';
  end if;
  if exists (select 1 from form_groups where "parentId" = new.id) then
    raise exception 'โฟลเดอร์ที่มีโฟลเดอร์ย่อยอยู่ ย้ายไปอยู่ในโฟลเดอร์อื่นไม่ได้';
  end if;
  return new;
end $$;
drop trigger if exists form_groups_one_level on form_groups;
create trigger form_groups_one_level before insert or update of "parentId" on form_groups
  for each row execute function form_groups_one_level();
