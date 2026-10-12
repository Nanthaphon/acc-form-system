-- A form can drop the ลำดับ column and give the millimetres to the others
-- (FormSettings.showSeq). The app has been writing the setting since
-- "a form can drop the ลำดับ column and keep the width", but form_settings has
-- no column to put it in: the save quietly dropped it (PGRST204) and the tick
-- came back on as soon as the page was opened again.
--
-- Run this once in the Supabase SQL Editor.

alter table form_settings add column if not exists "showSeq" boolean;

-- Nothing is backfilled on purpose: a form that never chose keeps NULL, which
-- the app reads as "show it" (showSeqColumn), exactly as it printed before.

-- Check: every form, and whether it shows the ลำดับ column.
select "formType", name,
       coalesce("showSeq", true) as shows_seq_column,
       "seqWidth"
from form_settings
order by name;
