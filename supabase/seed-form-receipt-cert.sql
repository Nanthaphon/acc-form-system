-- ============================================================================
-- Seed form #6: "ใบรับรองแทนใบเสร็จ" into the folder "เบิกค่าใช้จ่าย".
-- Has a certification paragraph (bodyText) below the table, above signatures.
-- Requires the "headerFields" and "bodyText" columns — the ALTERs below add
-- them if missing. Run once.
-- ============================================================================
alter table form_settings add column if not exists "headerFields" jsonb not null default '[]';
alter table form_settings add column if not exists "bodyText" text;

insert into form_settings ("formType", name, title, subject, attention, "formCode", categories, notes, columns, "headerFields", "signatureBlocks", "bodyText", "groupId", active)
values (
  gen_random_uuid(),
  'ใบรับรองแทนใบเสร็จ',
  'ใบรับรองแทนใบเสร็จรับเงิน',
  '',                       -- no เรื่อง on this form
  '',                       -- no เรียน on this form
  'GACK769-007',
  '[]'::jsonb,
  '["ค่าเดินทาง ค่าพาหนะ กรุณาระบุสถานที่เดินทางไปและเดินทางกลับให้ชัดเจน"]'::jsonb,
  '[
    {"key":"date","label":"วัน เดือน ปี","type":"date","width":80},
    {"key":"detail","label":"รายละเอียดรายจ่าย","type":"text"},
    {"key":"amount","label":"จำนวนเงิน","type":"number","width":90,"isTotal":true},
    {"key":"remark","label":"หมายเหตุ","type":"text","width":90}
  ]'::jsonb,
  '[{"id":"docDate","label":"วันที่","type":"date"}]'::jsonb,
  '[
    {"id":"requester","label":"ผู้เบิกจ่าย","online":false},
    {"id":"approver","label":"ผู้อนุมัติ","online":false}
  ]'::jsonb,
  'ขอรับรองว่า รายจ่ายข้างต้นนี้ไม่อาจเรียกเก็บเป็นใบเสร็จรับเงินจากผู้รับได้ และข้าพเจ้าได้จ่ายไปในงานของทางบริษัท เบสท์ เอช อาร์ เอ็ม จำกัด โดยแท้ ตั้งแต่วันที่ .................... ถึงวันที่ ....................',
  (select id from form_groups where name = 'เบิกค่าใช้จ่าย' order by "createdAt" desc limit 1),
  true
);
