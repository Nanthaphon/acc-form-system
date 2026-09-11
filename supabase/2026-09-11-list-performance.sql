-- ============================================================================
-- Faster document lists. Every signed block in submissions.signatures carries a
-- full copy of the signer's signature image (base64), so each list page used to
-- download every image of every document. signatures_light() returns the same
-- array without the images; the list pages select it as
-- `signatures:signatures_light` (opening a document still reads the full column).
-- The app falls back to the full column until this has been run.
-- Safe to run more than once.
-- ============================================================================
create or replace function public.signatures_light(s public.submissions)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(e - 'signatureImage' order by i), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(s.signatures) = 'array' then s.signatures else '[]'::jsonb end
  ) with ordinality as t(e, i)
$$;

-- Index for the "waiting for my signature" lookups (jsonb @> containment).
create index if not exists submissions_signatures_gin
  on public.submissions using gin (signatures jsonb_path_ops);

-- Let the API see the new function right away.
notify pgrst, 'reload schema';
