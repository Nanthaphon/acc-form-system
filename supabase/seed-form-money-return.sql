-- ============================================================================
-- Seed form #7: "ใบรับเงินคืนเข้าบริษัท" into the folder "เบิกค่าใช้จ่าย".
-- An intro paragraph above the table, a totals row but no amount-in-words box,
-- and no ชื่อ/นามสกุล requester line. Needs the introText / showRequester /
-- showAmountWords columns — the ALTERs below add them if missing. Run once.
-- ============================================================================
alter table form_settings add column if not exists "introText" text;
alter table form_settings add column if not exists "showRequester" boolean;
alter table form_settings add column if not exists "showAmountWords" boolean;

insert into form_settings ("formType", name, title, subject, attention, "formCode", categories, notes, columns, "signatureBlocks", "introText", "showRequester", "showAmountWords", "groupId", active)
values (
  gen_random_uuid(),
  'ใบรับเงินคืนเข้าบริษัท',
  'ใบรับเงินคืน',
  '',                       -- no เรื่อง
  '',                       -- no เรียน
  'GAC6709-008',
  '[]'::jsonb,
  '[]'::jsonb,
  '[
    {"key":"date","label":"วัน เดือน ปี","type":"date","width":80},
    {"key":"detail","label":"รายละเอียดการรับ/คืนเงิน","type":"text"},
    {"key":"job","label":"Job","type":"text","width":70},
    {"key":"amount","label":"จำนวนเงิน","type":"number","width":90,"isTotal":true},
    {"key":"remark","label":"หมายเหตุ","type":"text","width":90}
  ]'::jsonb,
  '[
    {"id":"requester","label":"ผู้จัดทำเอกสาร","online":false},
    {"id":"checker","label":"ผู้ตรวจสอบ","online":false}
  ]'::jsonb,
  E'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด  ได้รับเงินจาก ....................................................................\nครบถ้วนตามจำนวนเงิน ....................................................... บาท จึงได้ลงลายมือชื่อไว้เป็นหลักฐาน',
  false,                    -- showRequester: hide the ชื่อ/นามสกุล line
  false,                    -- showAmountWords: hide the บาทถ้วน box
  (select id from form_groups where name = 'เบิกค่าใช้จ่าย' order by "createdAt" desc limit 1),
  true
);
