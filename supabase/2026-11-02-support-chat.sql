-- ============================================================================
-- 2026-11-02 — แชทแจ้งปัญหา (ปุ่มลอยมุมขวาล่าง) + เมนูรับเรื่องของผู้ดูแลระบบ
--
-- Anyone signed in can open a conversation ("เรื่อง") about a problem and
-- write to the admins in it, with pictures. Admins see every conversation in
-- รับเรื่องแจ้งปัญหา, reply, and move it ใหม่ → กำลังดำเนินการ → เสร็จแล้ว.
--
--   support_tickets   one conversation; summary columns kept by the triggers
--   support_messages  its messages; images [{path,name,size,type,uploadedAt}]
--   storage 'support' the pictures, under <ticketId>/<uuid>.<ext>
--
-- Who wrote what, and when, is set here and never taken from the browser.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  "createdBy" uuid not null default auth.uid(),
  "reporterName" text not null default '',
  subject text not null default '',
  page text not null default '',                 -- the screen it was reported from
  status text not null default 'open' check (status in ('open', 'doing', 'done')),
  "createdAt" bigint not null default 0,
  "lastMessageAt" bigint,                        -- null until the first message
  "lastByReporter" boolean not null default true,
  "lastPreview" text not null default '',
  "messageCount" int not null default 0,
  "reporterReadAt" bigint not null default 0,
  "staffReadAt" bigint not null default 0
);
create index if not exists support_tickets_created_by on support_tickets ("createdBy");
create index if not exists support_tickets_last on support_tickets ("lastMessageAt" desc);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  "ticketId" uuid not null references support_tickets(id) on delete cascade,
  "fromUid" uuid not null default auth.uid(),
  "fromName" text not null default '',
  "fromReporter" boolean not null default true,
  body text not null default '',
  images jsonb not null default '[]',
  "createdAt" bigint not null default 0,
  constraint support_messages_not_empty check (length(trim(body)) > 0 or jsonb_array_length(images) > 0)
);
create index if not exists support_messages_ticket on support_messages ("ticketId", "createdAt");

create or replace function support_now() returns bigint language sql volatile as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint
$$;

-- A new conversation always belongs to whoever opens it, starts as ใหม่ and
-- with nothing in it yet.
create or replace function support_ticket_new() returns trigger
language plpgsql security definer set search_path = public as $$
declare me profiles;
begin
  select * into me from profiles where uid = auth.uid();
  new."createdBy" := auth.uid();
  new."reporterName" := coalesce(trim(me."firstName" || ' ' || me."lastName"), '');
  new.subject := left(trim(coalesce(new.subject, '')), 120);
  new.page := left(coalesce(new.page, ''), 200);
  new.status := 'open';
  new."createdAt" := support_now();
  new."lastMessageAt" := null;
  new."lastByReporter" := true;
  new."lastPreview" := '';
  new."messageCount" := 0;
  new."reporterReadAt" := 0;
  new."staffReadAt" := 0;
  return new;
end $$;
drop trigger if exists support_ticket_new on support_tickets;
create trigger support_ticket_new before insert on support_tickets
  for each row execute function support_ticket_new();

-- The sender, their side and the time come from the session.
create or replace function support_message_new() returns trigger
language plpgsql security definer set search_path = public as $$
declare me profiles; t support_tickets;
begin
  select * into t from support_tickets where id = new."ticketId";
  select * into me from profiles where uid = auth.uid();
  new."fromUid" := auth.uid();
  new."fromName" := coalesce(trim(me."firstName" || ' ' || me."lastName"), '');
  new."fromReporter" := (t."createdBy" = auth.uid());
  new.body := left(coalesce(new.body, ''), 4000);
  new."createdAt" := support_now();
  return new;
end $$;
drop trigger if exists support_message_new on support_messages;
create trigger support_message_new before insert on support_messages
  for each row execute function support_message_new();

-- Keeps the conversation's summary current. The writer has read their own
-- message; a reporter writing again reopens a finished conversation, and an
-- admin's first reply moves a new one to กำลังดำเนินการ.
create or replace function support_message_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update support_tickets set
    "lastMessageAt" = new."createdAt",
    "lastByReporter" = new."fromReporter",
    "lastPreview" = left(case when length(trim(new.body)) > 0 then trim(new.body) else '[รูปภาพ]' end, 140),
    "messageCount" = "messageCount" + 1,
    "reporterReadAt" = case when new."fromReporter" then new."createdAt" else "reporterReadAt" end,
    "staffReadAt" = case when new."fromReporter" then "staffReadAt" else new."createdAt" end,
    status = case
      when new."fromReporter" and status = 'done' then 'open'
      when not new."fromReporter" and status = 'open' then 'doing'
      else status end
  where id = new."ticketId";
  return null;
end $$;
drop trigger if exists support_message_after on support_messages;
create trigger support_message_after after insert on support_messages
  for each row execute function support_message_after();

-- Opening a conversation marks it read for that side.
create or replace function support_mark_read(ticket uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update support_tickets set "reporterReadAt" = support_now()
   where id = ticket and "createdBy" = auth.uid();
  if not found and is_admin() then
    update support_tickets set "staffReadAt" = support_now() where id = ticket;
  end if;
end $$;
grant execute on function support_mark_read(uuid) to authenticated;

-- ---- Access -----------------------------------------------------------------
alter table support_tickets enable row level security;
alter table support_messages enable row level security;

drop policy if exists support_tickets_select on support_tickets;
create policy support_tickets_select on support_tickets for select to authenticated
  using ("createdBy" = auth.uid() or is_admin());
drop policy if exists support_tickets_insert on support_tickets;
create policy support_tickets_insert on support_tickets for insert to authenticated
  with check (true);  -- the trigger makes it the caller's own
drop policy if exists support_tickets_update on support_tickets;
create policy support_tickets_update on support_tickets for update to authenticated
  using (is_admin()) with check (is_admin());
drop policy if exists support_tickets_delete on support_tickets;
create policy support_tickets_delete on support_tickets for delete to authenticated
  using (is_admin());
-- Only the status is ever changed from the browser; the rest is the triggers'.
revoke update on support_tickets from authenticated, anon;
grant update (status) on support_tickets to authenticated;

drop policy if exists support_messages_select on support_messages;
create policy support_messages_select on support_messages for select to authenticated
  using (exists (select 1 from support_tickets t where t.id = "ticketId"));
drop policy if exists support_messages_insert on support_messages;
create policy support_messages_insert on support_messages for insert to authenticated
  with check (exists (select 1 from support_tickets t where t.id = "ticketId"
    and (t."createdBy" = auth.uid() or is_admin())));
-- Messages are never edited or deleted one by one (deleting the conversation
-- takes its messages with it).

-- ---- Pictures ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support', 'support', false, 5242880, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

-- A picture follows its conversation: whoever may read it may see the
-- pictures, whoever may write in it may add one; only an admin removes them.
drop policy if exists support_files_read on storage.objects;
create policy support_files_read on storage.objects for select to authenticated
  using (bucket_id = 'support' and exists (
    select 1 from public.support_tickets t where t.id::text = (storage.foldername(name))[1]));
drop policy if exists support_files_insert on storage.objects;
create policy support_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'support' and exists (
    select 1 from public.support_tickets t where t.id::text = (storage.foldername(name))[1]
      and (t."createdBy" = auth.uid() or public.is_admin())));
drop policy if exists support_files_delete on storage.objects;
create policy support_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'support' and public.is_admin());
