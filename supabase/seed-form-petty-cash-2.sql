-- ============================================================================
-- Seed form #2: "ใบเบิกเงินสดย่อย" into the existing folder "เบิกค่าใช้จ่าย".
-- Run once (needs the "headerFields" column — run the header-fields ALTER first).
-- ============================================================================
insert into form_settings ("formType", name, title, subject, attention, "formCode", categories, notes, columns, "headerFields", "groupId", active)
values (
  gen_random_uuid(),
  'ใบเบิกเงินสดย่อย',
  'ใบเบิกเงินสดย่อย',
  '',                       -- no เรื่อง on this form
  '',                       -- no เรียน on this form
  'GAC-6704-002',
  '[]'::jsonb,
  '[]'::jsonb,
  '[{"key":"date","label":"วันเดือนปี","type":"date","width":90},{"key":"detail","label":"รายละเอียด","type":"text"},{"key":"qty","label":"จำนวนหน่วย","type":"number","width":80},{"key":"unitPrice","label":"จำนวนเงินต่อหน่วย","type":"number","width":110},{"key":"total","label":"จำนวนเงินรวม","type":"calc","width":110,"calc":{"op":"multiply","operands":["qty","unitPrice"]},"isTotal":true}]'::jsonb,
  '[{"id":"docDate","label":"วันที่","type":"date"}]'::jsonb,
  (select id from form_groups where name = 'เบิกค่าใช้จ่าย' order by "createdAt" desc limit 1),
  true
);
