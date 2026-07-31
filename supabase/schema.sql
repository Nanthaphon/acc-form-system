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

-- ===== Admin-only: fully delete an employee (auth user + profile + submissions) =====
create or replace function delete_employee(target uuid) returns void language plpgsql security definer as $$
begin
  if not is_admin() then
    raise exception 'only admin can delete employees';
  end if;
  if target = auth.uid() then
    raise exception 'cannot delete yourself';
  end if;
  delete from submissions where "createdBy" = target;
  delete from auth.users where id = target;  -- cascades to profiles (on delete cascade)
end $$;

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

-- ===== Form settings (editable form template) + per-company logo =====
alter table companies add column if not exists logo text;
create table if not exists form_settings (
  "formType" text primary key,
  title text not null default '', subject text not null default '', attention text not null default '',
  "formCode" text not null default '', categories jsonb not null default '[]', notes jsonb not null default '[]'
);
-- Dynamic form-builder columns (added for the dynamic column model).
-- App falls back to EXPENSE_CLAIM_DEFAULTS.columns when this is empty/missing,
-- so the app keeps working before this migration is applied.
alter table form_settings add column if not exists columns jsonb not null default '[]';
alter table form_settings enable row level security;
drop policy if exists form_settings_select on form_settings;
create policy form_settings_select on form_settings for select using (auth.uid() is not null);
drop policy if exists form_settings_write on form_settings;
create policy form_settings_write on form_settings for all using (is_admin()) with check (is_admin());
insert into form_settings ("formType", title, subject, attention, "formCode", categories, notes) values (
  'expense-claim','ใบขออนุมัติเบิกค่าใช้จ่าย','ขออนุมัติเบิกค่าใช้จ่าย','ท่านผู้จัดการ','GAC6709-003',
  '["ค่าไมล์เลทและค่าใช้จ่ายเดินทาง","ค่าใช้จ่ายต่างๆ","ค่าล่วงเวลา","ค่าเบี้ยเลี้ยง"]'::jsonb,
  '["1. พนักงานจะต้องเคลียร์ค่าใช้จ่ายทุกวันอังคารและพฤหัสบดี","2. พนักงานที่ซื้อของด้วยตนเองมีหน้าที่ต้องตรวจชื่อและที่อยู่ที่ลงในใบกำกับภาษีว่าถูกต้องหรือไม่ ถ้าผิดพนักงานต้องรับผิดชอบเปลี่ยนบิลเอง","3. ใบกำกับภาษีของค่าน้ำมันจะต้องระบุเลขทะเบียนรถคันที่พนักงานเอาไปใช้ด้วยทุกครั้ง","4. ใบเบิกค่าใช้จ่ายต่อ 1 ชุด ค่าใช้จ่ายทุกรายการจะต้องเป็นบริษัทเดียวกันและเดือนเดียวกัน"]'::jsonb
) on conflict ("formType") do nothing;
