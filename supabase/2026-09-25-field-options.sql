-- ============================================================================
-- 2026-09-25 — Custom Field: a managed list of values for employee fields.
--
-- Until now แผนก and ตำแหน่ง were typed freely, so the same department ends up
-- spelled three ways ("Payroll", "payroll", "Payrol"). This adds a list per
-- field that an admin keeps under เมนู Custom Field. The forms that fill the
-- field in offer its values to click, and anything else can still be typed:
-- the list suggests, it never refuses.
--
-- SAFE TO RUN MORE THAN ONCE. It creates, never drops, and seeds with
-- "on conflict do nothing".
-- ============================================================================

create table if not exists field_options (
  id uuid primary key default gen_random_uuid(),
  field text not null check (field in ('department', 'position')),
  value text not null check (btrim(value) <> ''),
  "sortOrder" integer not null default 0,
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (field, value)
);

-- Same rule as access_groups: anyone signed in may read the list (the
-- employee's own profile page needs it); only an admin may change it.
alter table field_options enable row level security;
drop policy if exists field_options_select on field_options;
create policy field_options_select on field_options for select using (auth.uid() is not null);
drop policy if exists field_options_write on field_options;
create policy field_options_write on field_options for all using (is_admin()) with check (is_admin());

-- Start the department list from the departments people already have, so the
-- dropdown is not empty on day one and nobody's current value falls outside
-- it. ตำแหน่ง is deliberately NOT seeded: positions tend to be too varied for
-- a fixed list, so that field stays free text until an admin chooses
-- otherwise by adding values to it.
insert into field_options (field, value, "sortOrder")
select 'department', d, (row_number() over (order by d))::integer
from (
  select distinct btrim(department) as d
  from profiles
  where btrim(coalesce(department, '')) <> ''
) existing
on conflict (field, value) do nothing;

-- Renaming a value renames it on every employee who has it, in one step. Done
-- in the database so the list and the people can never end up disagreeing
-- half-way through. The Super Admin's own record is only touched when the
-- Super Admin is the one renaming — the profile guard refuses anyone else,
-- and one refused row would otherwise undo the whole rename.
create or replace function rename_field_option(opt_id uuid, new_value text)
returns void language plpgsql security definer set search_path = public as $$
declare
  o field_options;
  v text := btrim(coalesce(new_value, ''));
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if v = '' then raise exception 'empty value'; end if;

  select * into o from field_options where id = opt_id;
  if not found then raise exception 'not found'; end if;
  if o.value = v then return; end if;

  update field_options set value = v where id = opt_id;

  if o.field = 'department' then
    update profiles set department = v
    where department = o.value and (not coalesce("isSuperAdmin", false) or is_super_admin());
  elsif o.field = 'position' then
    update profiles set "position" = v
    where "position" = o.value and (not coalesce("isSuperAdmin", false) or is_super_admin());
  end if;
end $$;

revoke all on function rename_field_option(uuid, text) from public;
grant execute on function rename_field_option(uuid, text) to authenticated;

notify pgrst, 'reload schema';
