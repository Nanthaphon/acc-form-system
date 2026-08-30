-- ============================================================================
-- Seed form #3: "ใบเบิกค่าใช้จ่าย" into the folder "เบิกค่าใช้จ่าย".
-- Same layout as the system's built-in expense-claim form (PC Code / PC Name /
-- วันทำงาน / วันละ + before-WHT / WHT 3% / net calc columns, 4 categories,
-- 4 notes). Run once.
-- ============================================================================
insert into form_settings ("formType", name, title, subject, attention, "formCode", categories, notes, columns, "signatureBlocks", "groupId", active)
values (
  gen_random_uuid(),
  'ใบเบิกค่าใช้จ่าย',
  'ใบขออนุมัติเบิกค่าใช้จ่าย',
  'ขออนุมัติเบิกค่าใช้จ่าย',
  'ท่านผู้จัดการ',
  'GAC-6709-003',
  '["ค่าไมล์เลทและค่าใช้จ่ายเดินทาง","ค่าใช้จ่ายต่างๆ","ค่าล่วงเวลา","ค่าเบี้ยเลี้ยง"]'::jsonb,
  '["1. พนักงานจะต้องเคลียร์ค่าใช้จ่ายทุกวันอังคารและพฤหัสบดี","2. พนักงานที่ซื้อของด้วยตนเองมีหน้าที่ต้องตรวจชื่อและที่อยู่ที่ลงในใบกำกับภาษีว่าถูกต้องหรือไม่ ถ้าผิดพนักงานต้องรับผิดชอบเปลี่ยนบิลเอง","3. ใบกำกับภาษีของค่าน้ำมันจะต้องระบุเลขทะเบียนรถคันที่พนักงานเอาไปใช้ด้วยทุกครั้ง","4. ใบเบิกค่าใช้จ่ายต่อ 1 ชุด ค่าใช้จ่ายทุกรายการจะต้องเป็นบริษัทเดียวกันและเดือนเดียวกัน"]'::jsonb,
  '[
    {"key":"date","label":"วันเดือนปี","type":"date","width":90},
    {"key":"pcCode","label":"PC Code","type":"text","width":80},
    {"key":"pcName","label":"PC Name","type":"text"},
    {"key":"workDays","label":"วันทำงาน","type":"number","width":70},
    {"key":"ratePerDay","label":"วันละ","type":"number","width":70},
    {"key":"bankAccount","label":"ธนาคาร","type":"text","width":90},
    {"key":"pcType","label":"ประเภทจ่าย","type":"text","width":80},
    {"key":"job","label":"Job","type":"text","width":70},
    {"key":"amountBeforeWht","label":"จำนวนเงินก่อนหัก","type":"calc","width":100,"calc":{"op":"multiply","a":"workDays","b":"ratePerDay"}},
    {"key":"wht3","label":"หักภาษี ณ ที่จ่าย 3%","type":"calc","width":100,"calc":{"op":"percent","a":"amountBeforeWht","percent":3}},
    {"key":"amountNet","label":"จำนวนเงินรวม","type":"calc","width":100,"calc":{"op":"subtract","a":"amountBeforeWht","b":"wht3"},"isTotal":true}
  ]'::jsonb,
  '[
    {"id":"requester","label":"ผู้เบิก","online":false},
    {"id":"head","label":"หัวหน้าแผนก","online":false},
    {"id":"approver","label":"ผู้อนุมัติ","online":false},
    {"id":"receiver","label":"ผู้รับเงิน","online":false},
    {"id":"checker","label":"ผู้ตรวจสอบ/ฝ่ายบัญชี","online":false}
  ]'::jsonb,
  (select id from form_groups where name = 'เบิกค่าใช้จ่าย' order by "createdAt" desc limit 1),
  true
);
