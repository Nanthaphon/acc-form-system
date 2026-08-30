-- ============================================================================
-- Seed form #4: "แบบฟอร์มรายงานการทำงาน" into the folder "เบิกค่าใช้จ่าย".
-- A non-financial travel/work report: date + detail + from + to, no totals,
-- no amount-in-words (hidden automatically for forms with no numeric columns).
-- Run once.
-- ============================================================================
insert into form_settings ("formType", name, title, subject, attention, "formCode", categories, notes, columns, "signatureBlocks", "groupId", active)
values (
  gen_random_uuid(),
  'แบบฟอร์มรายงานการทำงาน',
  'ใบรายงานการทำงาน',
  '',                       -- no เรื่อง on this form
  'ท่านผู้จัดการ',
  'GACK769-005',
  '[]'::jsonb,
  '[]'::jsonb,
  '[
    {"key":"date","label":"วันเดือนปี","type":"date","width":80},
    {"key":"detail","label":"รายละเอียดการเดินทาง","type":"text"},
    {"key":"from","label":"จาก","type":"text","width":70},
    {"key":"to","label":"ถึง","type":"text","width":70}
  ]'::jsonb,
  '[
    {"id":"requester","label":"พนักงาน","online":false},
    {"id":"approver","label":"ผู้อนุมัติ","online":false},
    {"id":"checker","label":"ผู้ตรวจสอบ","online":false}
  ]'::jsonb,
  (select id from form_groups where name = 'เบิกค่าใช้จ่าย' order by "createdAt" desc limit 1),
  true
);
