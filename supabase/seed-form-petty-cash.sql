-- ============================================================================
-- Seed: folder "เบิกค่าใช้จ่าย" + form "ใบขอเบิกเงินทดรองจ่าย"
-- Run once in the Supabase SQL editor. Creates a new folder and one form in it.
-- ============================================================================
with g as (
  insert into form_groups (id, name, "sortOrder", "createdAt")
  values (gen_random_uuid(), 'เบิกค่าใช้จ่าย', extract(epoch from now())::int, (extract(epoch from now()) * 1000)::bigint)
  returning id
)
insert into form_settings ("formType", name, title, subject, attention, "formCode", categories, notes, columns, "groupId", active)
select
  gen_random_uuid(),
  'ใบขอเบิกเงินทดรองจ่าย',
  'ใบขอเบิกเงินทดรองจ่าย',
  'ขออนุมัติเบิกเงินทดรองจ่าย',
  'ท่านผู้จัดการ',
  'PC',
  '[]'::jsonb,
  '["1. พนักงานจะต้องเคลียร์ค่าใช้จ่ายทุกวันอังคารและพฤหัสบดี","2. พนักงานที่ซื้อของด้วยตนเองมีหน้าที่ต้องตรวจชื่อและที่อยู่ที่ลงในใบกำกับภาษีว่าถูกต้องหรือไม่ ถ้าผิดพนักงานต้องรับผิดชอบเปลี่ยนบิลเอง","3. ใบกำกับภาษีของค่าน้ำมันจะต้องระบุเลขทะเบียนรถคันที่พนักงานเอาไปใช้ด้วยทุกครั้ง","4. ใบเบิกค่าใช้จ่ายต่อ 1 ชุด ค่าใช้จ่ายทุกรายการจะต้องเป็นบริษัทเดียวกันและเดือนเดียวกัน"]'::jsonb,
  '[{"key":"detail","label":"รายการเบิก","type":"text"},{"key":"account","label":"เลขที่บัญชี","type":"text","width":120},{"key":"amount","label":"จำนวนเงินประมาณ (บาท)","type":"number","width":140,"isTotal":true}]'::jsonb,
  g.id,
  true
from g;
