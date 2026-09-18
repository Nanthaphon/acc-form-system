-- ============================================================================
-- 2026-09-18 — take one signature back off a document.
--   Until now the only undo was cancel_signing(), which clears EVERY signature
--   and is offered only while a document is still waiting for someone: once
--   every line was signed there was no way back at all. An admin who signs the
--   wrong line needs to undo just that line, without touching anybody else's
--   signature.
--   unsign_document() clears one line: the signature image, the timestamp and
--   the assignment go, so the line is blank again and can be signed or sent to
--   someone else. Allowed for the person whose signature it is, and for the
--   document's owner.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

create or replace function unsign_document(sub_id uuid, block_id text)
returns void language plpgsql security definer set search_path = public as $$
declare r submissions;
begin
  select * into r from submissions where id = sub_id;
  if not found then raise exception 'not found'; end if;

  if not exists (
    select 1 from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
    where e->>'blockId' = block_id
      and e->>'status' = 'signed'
      and (e->>'assignedUid' = auth.uid()::text or r."createdBy" = auth.uid())
  ) then
    raise exception 'cannot remove this signature';
  end if;

  update submissions set signatures = (
    select coalesce(jsonb_agg(e), '[]'::jsonb)
    from jsonb_array_elements(coalesce(r.signatures, '[]'::jsonb)) e
    where e->>'blockId' <> block_id
  ) where id = sub_id;
end $$;

revoke all on function unsign_document(uuid, text) from public, anon;
grant execute on function unsign_document(uuid, text) to authenticated;

-- Let the API see the new function right away.
notify pgrst, 'reload schema';
