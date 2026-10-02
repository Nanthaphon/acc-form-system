-- ============================================================================
-- 2026-10-02 — tidy the company address as it prints on every document:
--   "ชั้น6"  → "ชั้น 6"   (a space before the floor number)
--   "ถ."     → "ถนน"      (spelled out, as the paper forms have it)
--
-- Applies to every company that still carries either shorthand, so a second
-- company added later is covered too. Safe to re-run: text already in the long
-- form is left as it is.
--
-- Run in Supabase → SQL Editor.
-- ============================================================================

update companies
   set address = regexp_replace(
                   regexp_replace(address, 'ชั้น[[:space:]]*([0-9])', 'ชั้น \1', 'g'),
                   'ถ\.[[:space:]]*', 'ถนน', 'g')
 where address ~ 'ชั้น[0-9]' or address ~ 'ถ\.';

select id, name, address from companies order by name;
