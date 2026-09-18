-- ============================================================================
-- 2026-09-18 — editable section headings on the fill-in screen.
--   form_settings."requesterTitle" / "itemsTitle" replace the hard-coded
--   "ข้อมูลผู้เบิก" / "รายการเบิก" headings. NULL or blank = use the built-in
--   wording (see sectionTitles() in src/types/schema.ts).
-- Until this has been run the app still saves everything else: the form editor
-- reports the two columns as skipped instead of failing the whole save.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

alter table form_settings add column if not exists "requesterTitle" text;
alter table form_settings add column if not exists "itemsTitle" text;

-- Let the API see the new columns right away.
notify pgrst, 'reload schema';
