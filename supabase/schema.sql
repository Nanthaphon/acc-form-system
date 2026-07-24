-- ===== Tables (quoted mixed-case columns to match the app's TS field names) =====
create table if not exists companies (
  id text primary key,
  name text not null,
  address text not null default ''
);

create table if not exists profiles (
  uid uuid primary key references auth.users(id) on delete cascade,
  "employeeId" text unique not null,
  "firstName" text not null default '',
  "lastName" text not null default '',
  "position" text not null default '',
  department text not null default '',
  "companyId" text not null default '',
  "defaultJob" text not null default '',
  "bankAccount" text not null default '',
  role text not null default 'employee',
  "mustChangePassword" boolean not null default true,
  "createdAt" bigint not null default 0
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  "formType" text not null,
  "docNumber" text not null,
  header jsonb not null,
  items jsonb not null,
  totals jsonb not null,
  "createdBy" uuid not null references auth.users(id),
  "createdByEmployeeId" text not null,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "printCount" int not null default 0,
  "lastPrintedAt" bigint
);

create table if not exists counters (
  "formType" text primary key,
  "lastNumber" int not null default 0
);

-- ===== Helper: is the current user an admin? (security definer avoids RLS recursion) =====
create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles where uid = auth.uid() and role = 'admin')
$$;

-- ===== Atomic running document number =====
create or replace function next_doc_number(form_type text) returns int language plpgsql as $$
declare n int;
begin
  insert into counters ("formType","lastNumber") values (form_type, 1)
  on conflict ("formType") do update set "lastNumber" = counters."lastNumber" + 1
  returning "lastNumber" into n;
  return n;
end $$;

-- ===== Atomic print increment =====
create or replace function increment_print(sub_id uuid) returns void language sql as $$
  update submissions
  set "printCount" = "printCount" + 1,
      "lastPrintedAt" = (extract(epoch from now()) * 1000)::bigint
  where id = sub_id
$$;

-- ===== Prevent non-admins from changing their own role / employeeId =====
create or replace function protect_profile_fields() returns trigger language plpgsql as $$
begin
  if not is_admin() then
    if new.role <> old.role or new."employeeId" <> old."employeeId" then
      raise exception 'cannot change role or employeeId';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on profiles;
create trigger protect_profile before update on profiles
  for each row execute function protect_profile_fields();

-- ===== Row Level Security =====
alter table companies enable row level security;
alter table profiles enable row level security;
alter table submissions enable row level security;
alter table counters enable row level security;

drop policy if exists companies_select on companies;
create policy companies_select on companies for select using (auth.uid() is not null);
drop policy if exists companies_write on companies;
create policy companies_write on companies for all using (is_admin()) with check (is_admin());

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (uid = auth.uid() or is_admin());
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert with check (is_admin());
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using (uid = auth.uid() or is_admin()) with check (uid = auth.uid() or is_admin());

drop policy if exists submissions_select on submissions;
create policy submissions_select on submissions for select using ("createdBy" = auth.uid() or is_admin());
drop policy if exists submissions_insert on submissions;
create policy submissions_insert on submissions for insert with check ("createdBy" = auth.uid());
drop policy if exists submissions_update on submissions;
create policy submissions_update on submissions for update using ("createdBy" = auth.uid() or is_admin());

drop policy if exists counters_all on counters;
create policy counters_all on counters for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ===== Seed companies =====
insert into companies (id, name, address) values
  ('globe', 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น6 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ'),
  ('besthrm', 'บริษัท เบสท์ เอช อาร์ เอ็ม จำกัด', '-')
on conflict (id) do nothing;
