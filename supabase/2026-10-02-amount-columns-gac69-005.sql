-- ============================================================================
-- 2026-10-02 — add the three money columns to ใบเบิกค่าใช้จ่าย (รหัสฟอร์ม GAC69-005),
-- the ones the paper form has on the right-hand side:
--
--   จำนวนเงินก่อนหัก      = วันทำงาน × วันละ
--   หักภาษี ณ ที่จ่าย 3%  = 3% ของ จำนวนเงินก่อนหัก
--   จำนวนเงินรวม          = จำนวนเงินก่อนหัก − หักภาษี ณ ที่จ่าย 3%   ← ยอดรวมของเอกสาร
--
-- The last one is marked as the document total, so ยอดสุทธิ and the baht text
-- stop reading the วันละ column.
--
-- Nothing else on the form is touched, and documents already filled in keep
-- their stored numbers.
--
-- Run in Supabase → SQL Editor. Safe to re-run: it stops if the columns are there.
-- ============================================================================

with target as (
  select "formType", columns from form_settings where "formCode" = 'GAC69-005' limit 1
), keys as (
  select
    (select e->>'key' from jsonb_array_elements((select columns from target)) e where e->>'label' = 'วันทำงาน' limit 1) as days_key,
    (select e->>'key' from jsonb_array_elements((select columns from target)) e where e->>'label' = 'วันละ' limit 1) as rate_key
)
update form_settings f
   set columns =
         -- only one column may carry isTotal, so clear it everywhere first
         (select coalesce(jsonb_agg(e - 'isTotal' order by i), '[]'::jsonb)
            from jsonb_array_elements(f.columns) with ordinality as t(e, i))
         || jsonb_build_array(
              jsonb_build_object(
                'key', 'amountBefore', 'label', 'จำนวนเงินก่อนหัก', 'type', 'calc', 'width', 16,
                'calc', jsonb_build_object('op', 'multiply', 'operands',
                  jsonb_build_array((select days_key from keys), (select rate_key from keys)))),
              jsonb_build_object(
                'key', 'whtAmount', 'label', 'หักภาษี ณ ที่จ่าย 3%', 'type', 'calc', 'width', 14,
                'calc', jsonb_build_object('op', 'percent', 'a', 'amountBefore', 'percent', 3)),
              jsonb_build_object(
                'key', 'amountNet', 'label', 'จำนวนเงินรวม', 'type', 'calc', 'width', 16, 'isTotal', true,
                'calc', jsonb_build_object('op', 'subtract', 'operands',
                  jsonb_build_array('amountBefore', 'whtAmount')))
            ),
       "updatedAt" = (extract(epoch from now()) * 1000)::bigint
 where f."formType" = (select "formType" from target)
   and (select days_key from keys) is not null   -- a column labelled วันทำงาน must exist
   and (select rate_key from keys) is not null   -- and one labelled วันละ
   and not exists (select 1 from jsonb_array_elements(f.columns) e where e->>'key' = 'amountBefore');

-- What the form's columns look like now.
select e->>'key' as key, e->>'label' as label, e->>'type' as type,
       e->>'width' as width_mm, e->>'isTotal' as is_total, e->'calc' as formula
from form_settings f, jsonb_array_elements(f.columns) with ordinality as t(e, i)
where f."formCode" = 'GAC69-005'
order by i;
