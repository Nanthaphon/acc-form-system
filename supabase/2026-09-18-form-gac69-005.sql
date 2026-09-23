-- ============================================================================
-- 2026-09-18 — set up the form GAC69-005 to match the paper
-- "ใบขออนุมัติเบิกค่าใช้จ่าย" the accounting team actually uses.
--
-- Only that one form is touched (matched on its form code), and only its
-- layout: the documents already filled in on it are not read or changed.
-- Run once in Supabase → SQL Editor. Safe to re-run — running it again just
-- puts the same layout back.
--
-- What it sets, taken off the scan:
--   หัวเอกสาร   ใบขออนุมัติเบิกค่าใช้จ่าย
--   หมวด        ค่าไมล์เลทและค่าใช้จ่ายเดินทาง · ค่าใช้จ่ายต่างๆ ·
--               ค่าจองตั๋วเครื่องบินเดินทาง · ค่าเบี้ยเลี้ยง
--   คอลัมน์      วด/ป · รายละเอียด · ค่าโรงแรม · ต้นทุน (Supplier) ·
--               ค่าน้ำมัน · ค่าโทรศัพท์ · ค่าตั๋วเครื่องบิน ·
--               ค่าใช้จ่ายอื่น (รายละเอียด + ค่าใช้จ่าย) · จำนวนรวม
--   ลายเซ็น      ผู้เบิก · หัวหน้าแผนก · ผู้อนุมัติ · ผู้รับเงิน ·
--               ผู้ตรวจสอบ/ฝ่ายบัญชี
--   หมายเหตุ     4 ข้อท้ายเอกสาร
--
-- "จำนวนรวม" adds up the seven money columns, so it fills itself in.
-- VAT 7%, หัก 3% and หัก 5% ค่าประกันงาน are ticked per document on the form
-- itself, not here.
-- ============================================================================

-- The form editor writes these through a "skip what the database does not have"
-- path, so a column it never managed to create would still be missing here.
alter table form_settings add column if not exists "headerFields" jsonb not null default '[]';
alter table form_settings add column if not exists "introText" text;
alter table form_settings add column if not exists "bodyText" text;
alter table form_settings add column if not exists "showRequester" boolean;
alter table form_settings add column if not exists "showAmountWords" boolean;
alter table form_settings add column if not exists "signatureBlocks" jsonb not null default '[]';
alter table form_settings add column if not exists "requesterTitle" text;
alter table form_settings add column if not exists "itemsTitle" text;
-- Width of the built-in ลำดับ column. The default is sized for the row numbers,
-- not for the word itself, so the heading used to drop onto a second line.
alter table form_settings add column if not exists "seqWidth" int;

update form_settings set
  title = 'ใบขออนุมัติเบิกค่าใช้จ่าย',
  subject = '',        -- printed per document instead, via the "เรื่อง" field below
  attention = '',      -- the paper form has no "เรียน" line

  categories = '[
    "ค่าไมล์เลทและค่าใช้จ่ายเดินทาง",
    "ค่าใช้จ่ายต่างๆ",
    "ค่าจองตั๋วเครื่องบินเดินทาง",
    "ค่าเบี้ยเลี้ยง"
  ]'::jsonb,

  -- widths are relative weights on the printed page, not pixels
  columns = '[
    {"key":"docDate","label":"วด/ป","type":"date","width":95},
    {"key":"detail","label":"รายละเอียด","type":"text","width":135},
    {"key":"hotel","label":"ค่าโรงแรม","type":"number","width":76},
    {"key":"supplier","label":"ต้นทุน\nSupplier","type":"number","width":78},
    {"key":"fuel","label":"ค่าน้ำมัน\nใบเสร็จ\nFleet Card","type":"number","width":88},
    {"key":"phone","label":"ค่าโทรศัพท์\nค่าส่งเอกสาร\nค่า Fax","type":"number","width":100},
    {"key":"flight","label":"ค่าตั๋ว\nเครื่องบิน","type":"number","width":76},
    {"key":"otherDetail","label":"ค่าใช้จ่ายอื่น\nรายละเอียด","type":"text","width":95},
    {"key":"other","label":"ค่าใช้จ่ายอื่น\nค่าใช้จ่าย","type":"number","width":95},
    {"key":"rowTotal","label":"จำนวนรวม","type":"calc","width":80,"isTotal":true,"calc":{"op":"add","operands":["hotel","supplier","fuel","phone","flight","other"]}}
  ]'::jsonb,

  "signatureBlocks" = '[
    {"id":"requester","label":"ผู้เบิก"},
    {"id":"head","label":"หัวหน้าแผนก"},
    {"id":"approver","label":"ผู้อนุมัติ"},
    {"id":"receiver","label":"ผู้รับเงิน"},
    {"id":"checker","label":"ผู้ตรวจสอบ/ฝ่ายบัญชี"}
  ]'::jsonb,

  notes = '[
    "1. พนักงานจะต้องเคลียร์ค่าใช้จ่ายทุกวันอังคารและพฤหัสบดี",
    "2. พนักงานที่ซื้อของด้วยตนเองมีหน้าที่ต้องตรวจชื่อและที่อยู่ที่ลงในใบกำกับภาษีว่าถูกต้องหรือไม่ ถ้าผิดพนักงานต้องรับผิดชอบเปลี่ยนบิลเอง",
    "3. ใบกำกับภาษีของค่าน้ำมันจะต้องระบุเลขทะเบียนรถคันที่พนักงานเอาไปใช้ด้วยทุกครั้ง",
    "4. ใบเบิกค่าใช้จ่ายต่อ 1 ชุด ค่าใช้จ่ายทุกรายการจะต้องเป็นบริษัทเดียวกันและเดือนเดียวกัน"
  ]'::jsonb,

  -- "เรื่อง" and "วันที่" sit above the table on the paper form; they are the
  -- two extra header fields the employee fills in.
  "headerFields" = '[
    {"id":"subjectLine","label":"เรื่อง","type":"text"},
    {"id":"docDate","label":"วันที่","type":"date"}
  ]'::jsonb,

  "seqWidth" = 48,     -- fits the word "ลำดับ" on one line
  "requesterTitle" = 'ข้อมูลผู้เบิก',
  "itemsTitle" = 'รายการค่าใช้จ่าย',
  "showRequester" = true,
  "showAmountWords" = true,
  "updatedAt" = (extract(epoch from now()) * 1000)::bigint
where "formCode" = 'GAC69-005';

-- Check what was changed (should be exactly one row).
select "formType", name, "formCode", jsonb_array_length(columns) as columns,
       jsonb_array_length("signatureBlocks") as signature_blocks, "seqWidth"
from form_settings where "formCode" = 'GAC69-005';
