import { supabase } from '../lib/supabase'
import type { SubmissionVersion, ExpenseHeader, ExpenseRow, ExpenseTotals } from '../types/schema'

export interface Snapshot { header: ExpenseHeader; items: ExpenseRow[]; totals: ExpenseTotals }

// All versions of a document, newest first.
export async function listVersions(submissionId: string): Promise<SubmissionVersion[]> {
  const { data } = await supabase.from('submission_versions').select('*')
    .eq('submissionId', submissionId).order('version', { ascending: false })
  return (data ?? []) as SubmissionVersion[]
}

// Append a new snapshot as version (max+1). Best-effort: a failure here must not
// break the save that triggered it, so callers wrap this in try/catch.
export async function addVersion(submissionId: string, snap: Snapshot, editedBy: string, editedByName: string): Promise<void> {
  const { data } = await supabase.from('submission_versions').select('version')
    .eq('submissionId', submissionId).order('version', { ascending: false }).limit(1)
  const next = (((data?.[0] as { version?: number })?.version) ?? 0) + 1
  const row = {
    submissionId, version: next, header: snap.header, items: snap.items, totals: snap.totals,
    editedBy, editedByName, editedAt: Date.now(),
  }
  const { error } = await supabase.from('submission_versions').insert(row)
  if (error) throw error
}
