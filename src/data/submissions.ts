import { supabase } from '../lib/supabase'
import type { Submission, SubmissionStatus } from '../types/schema'
import { formatDocNumber } from '../shared/docNumber'
import { addVersion } from './versions'

export interface Editor { uid: string; name: string }

export type SubmissionDraft = Omit<Submission,
  'id' | 'docNumber' | 'createdAt' | 'updatedAt' | 'printCount' | 'lastPrintedAt'>

export async function createSubmission(dr: SubmissionDraft, docPrefix: string, editor?: Editor): Promise<Submission> {
  const now = Date.now()
  const d = new Date(now)
  // Reset the running number each month: use a per-form, per-month counter key.
  const period = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const { data: seq, error } = await supabase.rpc('next_doc_number', { form_type: `${dr.formType}:${period}` })
  if (error) throw error
  const docNumber = formatDocNumber(docPrefix, d, seq as number)
  const row = { ...dr, docNumber, createdAt: now, updatedAt: now, printCount: 0, lastPrintedAt: null }
  const { data, error: e2 } = await supabase.from('submissions').insert(row).select().single()
  if (e2) throw e2
  const created = data as Submission
  // Record version 1 (best-effort — don't fail the create if history insert fails).
  try {
    await addVersion(created.id, { header: dr.header, items: dr.items, totals: dr.totals },
      editor?.uid ?? dr.createdBy, editor?.name ?? `${dr.header.firstName} ${dr.header.lastName}`.trim())
  } catch { /* ignore */ }
  return created
}
export async function updateSubmission(id: string, s: Submission, editor?: Editor): Promise<void> {
  const before = await getSubmission(id)
  const { error } = await supabase.from('submissions')
    .update({ header: s.header, items: s.items, totals: s.totals, updatedAt: Date.now() })
    .eq('id', id)
  if (error) throw error
  // Add a version only when the content actually changed.
  const changed = !before
    || JSON.stringify(before.header) !== JSON.stringify(s.header)
    || JSON.stringify(before.items) !== JSON.stringify(s.items)
    || JSON.stringify(before.totals) !== JSON.stringify(s.totals)
  if (changed) {
    try { await addVersion(id, { header: s.header, items: s.items, totals: s.totals }, editor?.uid ?? '', editor?.name ?? '') }
    catch { /* ignore */ }
  }
}
export async function incrementPrint(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_print', { sub_id: id })
  if (error) throw error
}
// Grand total for display — tolerant of old submissions saved before the
// dynamic-column model (which used { totalNet } instead of { grandTotal }).
export function submissionAmount(s: Submission): number {
  const t = s.totals as unknown as { grandTotal?: number; totalNet?: number }
  return Number(t?.grandTotal ?? t?.totalNet) || 0
}

export async function deleteSubmission(id: string): Promise<void> {
  const { error } = await supabase.from('submissions').delete().eq('id', id)
  if (error) throw error
}

// ----- Approval workflow (server-enforced via SECURITY DEFINER RPCs) -----
export async function requestApproval(id: string): Promise<void> {
  const { error } = await supabase.rpc('request_approval', { sub_id: id })
  if (error) throw error
}
export async function approveSubmission(id: string): Promise<void> {
  const { error } = await supabase.rpc('approve_submission', { sub_id: id })
  if (error) throw error
}
export async function rejectSubmission(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('reject_submission', { sub_id: id, reason })
  if (error) throw error
}
// Pending documents the current approver may act on (RLS limits to covered depts).
export async function listPendingForApprover(): Promise<Submission[]> {
  const { data } = await supabase.from('submissions').select('*')
    .eq('status', 'pending').order('requestedAt', { ascending: true })
  return (data ?? []) as Submission[]
}
export async function countPendingForApprover(): Promise<number> {
  const { count } = await supabase.from('submissions')
    .select('id', { count: 'exact', head: true }).eq('status', 'pending')
  return count ?? 0
}

// Effective status (older rows saved before this feature have no status column).
export function subStatus(s: Submission): SubmissionStatus {
  return s.status ?? 'draft'
}
const STATUS_META: Record<SubmissionStatus, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-600' },
  pending: { label: 'รออนุมัติ', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'ตีกลับ', className: 'bg-red-100 text-red-700' },
}
export function statusMeta(s: SubmissionStatus) { return STATUS_META[s] }

export async function getSubmission(id: string): Promise<Submission | null> {
  const { data } = await supabase.from('submissions').select('*').eq('id', id).maybeSingle()
  return (data as Submission) ?? null
}
export async function listMySubmissions(uid: string): Promise<Submission[]> {
  const { data } = await supabase.from('submissions').select('*')
    .eq('createdBy', uid).order('createdAt', { ascending: false })
  return (data ?? []) as Submission[]
}
export async function listAllSubmissions(): Promise<Submission[]> {
  const { data } = await supabase.from('submissions').select('*').order('createdAt', { ascending: false })
  return (data ?? []) as Submission[]
}
