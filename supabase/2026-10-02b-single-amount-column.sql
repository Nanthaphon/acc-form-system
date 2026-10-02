-- ============================================================================
-- 2026-10-02 — ใบเบิกค่าใช้จ่าย (GAC69-005) keeps ONE money column.
--
-- The per-row 3% line is not wanted: the document already deducts หัก ณ ที่จ่าย
-- under the table, from the whole claim. So:
--
--   * "หักภาษี ณ ที่จ่าย 3%" and "จำนวนเงินรวม" columns are removed
--   * "จำนวนเงินก่อนหัก" becomes plain "จำนวนเงิน" (วันทำงาน × วันละ) and is the
--     document total, so ยอดสุทธิ and the baht text read it
--
-- If the earlier script was never run, this adds the one column instead.
-- Documents already filled in keep their stored numbers.
--
-- Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

-- 1) drop the two extra columns, and leave the amount as the only total
update form_settings f
   set columns = (
         select coalesce(jsonb_agg(
                  case when e->>'key' = 'amountBefore'
                       then (e - 'isTotal') || jsonb_build_object('label', 'จำนวนเงิน', 'isTotal', true, 'width', 20)
                       else e - 'isTotal' end
                  order by i), '[]'::jsonb)
           from jsonb_array_elements(f.columns) with ordinality as t(e, i)
          where e->>'key' not in ('whtAmount', 'amountNet')
       ),
       "updatedAt" = (extract(epoch from now()) * 1000)::bigint
 where f."formCode" = 'GAC69-005';

-- 2) …and if there was no amount column at all, build it from วันทำงาน × วันละ
with target as (
  select "formType", columns from form_settings where "formCode" = 'GAC69-005' limit 1
), keys as (
  select
    (select e->>'key' from jsonb_array_elements((select columns from target)) e where e->>'label' = 'วันทำงาน' limit 1) as days_key,
    (select e->>'key' from jsonb_array_elements((select columns from target)) e where e->>'label' = 'วันละ' limit 1) as rate_key
)
update form_settings f
   set columns = f.columns || jsonb_build_array(
         jsonb_build_object(
           'key', 'amountBefore', 'label', 'จำนวนเงิน', 'type', 'calc', 'width', 20, 'isTotal', true,
           'calc', jsonb_build_object('op', 'multiply', 'operands',
             jsonb_build_array((select days_key from keys), (select rate_key from keys))))
       ),
       "updatedAt" = (extract(epoch from now()) * 1000)::bigint
 where f."formType" = (select "formType" from target)
   and (select days_key from keys) is not null
   and (select rate_key from keys) is not null
   and not exists (select 1 from jsonb_array_elements(f.columns) e where e->>'key' = 'amountBefore');

-- What the form's columns look like now.
select e->>'key' as key, e->>'label' as label, e->>'type' as type,
       e->>'width' as width_mm, e->>'isTotal' as is_total, e->'calc' as formula
from form_settings f, jsonb_array_elements(f.columns) with ordinality as t(e, i)
where f."formCode" = 'GAC69-005'
order by i;
