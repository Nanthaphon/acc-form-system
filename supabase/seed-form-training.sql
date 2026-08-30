-- ============================================================================
-- Seed form #5: "แบบฟอร์มการอบรม" into the folder "เบิกค่าใช้จ่าย".
-- A training-summary report: header fields (course / date / venue) + a table of
-- date + detail + how-applied. No totals / amount-in-words (no numeric columns).
-- Needs the "headerFields" column (run the header-fields ALTER first). Run once.
-- ============================================================================
insert into form_settings ("formType", name, title, subject, attention, "formCode", categories, notes, columns, "headerFields", "signatureBlocks", "groupId", active)
values (
  gen_random_uuid(),
  'แบบฟอร์มการอบรม',
  'ใบสรุปรายงานการอบรม',
  '',                       -- no เรื่อง on this form
  'ท่านผู้จัดการ',
  'GACK769-006',
  '[]'::jsonb,
  '[]'::jsonb,
  '[
    {"key":"date","label":"วันเดือนปี","type":"date","width":80},
    {"key":"detail","label":"รายละเอียดการอบรม","type":"text"},
    {"key":"apply","label":"นำมาใช้กับงาน","type":"text","width":130}
  ]'::jsonb,
  '[
    {"id":"course","label":"ผู้จัดอบรม/หลักสูตร","type":"text"},
    {"id":"trainDate","label":"วันที่","type":"date"},
    {"id":"venue","label":"ผู้เข้าอบรม/สถานที่อบรม","type":"text"}
  ]'::jsonb,
  '[
    {"id":"requester","label":"พนักงาน","online":false},
    {"id":"approver","label":"ผู้อนุมัติ","online":false},
    {"id":"checker","label":"ผู้ตรวจสอบ","online":false}
  ]'::jsonb,
  (select id from form_groups where name = 'เบิกค่าใช้จ่าย' order by "createdAt" desc limit 1),
  true
);
