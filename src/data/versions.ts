import { supabase } from '../lib/supabase'
import type { Submission, SubmissionVersion, ExpenseHeader, ExpenseRow, ExpenseTotals } from '../types/schema'

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

// version count per submission (RLS-scoped to what the viewer may see), used to
// flag edited documents in the history lists.
export async function getVersionCounts(): Promise<Record<string, number>> {
  const { data } = await supabase.from('submission_versions').select('submissionId')
  const out: Record<string, number> = {}
  for (const r of (data ?? []) as { submissionId: string }[]) out[r.submissionId] = (out[r.submissionId] ?? 0) + 1
  return out
}

// A short "edited" label for a document, or null if it was never edited.
// version 1 = the original, so edits = versionCount - 1. Documents created
// before the versioning feature have no versions → fall back to updatedAt.
export function editLabel(s: Submission, counts: Record<string, number>): string | null {
  const n = counts[s.id] ?? 0
  if (n > 1) return `แก้ไข ${n - 1} ครั้ง`
  if (n === 0 && s.updatedAt > s.createdAt) return 'แก้ไขแล้ว'
  return null
}
