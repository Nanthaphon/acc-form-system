-- ============================================================================
-- 2026-09-25 — a short, everyday name for each company.
--
-- The import file used to ask for a company by its code (globe, besthrm).
-- People know them as "Globe Syndicate" and "Besthrm", and that is what their
-- own employee lists already say, so the file now offers — and accepts — this
-- short name instead.
--
-- The code itself does not change: it is what every employee record and every
-- document points at. Nor do the other two names, which are printed on the
-- documents (the Thai legal name, and headerName in English).
--
-- SAFE TO RUN MORE THAN ONCE. It only fills a short name that is still empty,
-- so one changed by hand later is left alone.
-- ============================================================================

alter table companies add column if not exists "shortName" text not null default '';

update companies set "shortName" = 'Globe Syndicate' where id = 'globe' and "shortName" = '';
update companies set "shortName" = 'Besthrm' where id = 'besthrm' and "shortName" = '';

notify pgrst, 'reload schema';
