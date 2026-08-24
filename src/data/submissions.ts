import { supabase } from '../lib/supabase'
import type { Submission, SubmissionStatus, DocSignature } from '../types/schema'
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
  const t = s.totals as unknown as { netTotal?: number; grandTotal?: number; totalNet?: number }
  return Number(t?.netTotal ?? t?.grandTotal ?? t?.totalNet) || 0
}

export async function deleteSubmission(id: string): Promise<void> {
  const { error } = await supabase.from('submissions').delete().eq('id', id)
  if (error) throw error
}

// ----- Online signatures -----
export interface Signer { uid: string; name: string }
// Everyone can list possible signers (name + uid only) via a SECURITY DEFINER RPC.
export async function listSigners(): Promise<Signer[]> {
  const { data } = await supabase.rpc('list_signers')
  return (data ?? []) as Signer[]
}
// Owner assigns signers to online blocks (already-signed blocks are preserved).
export async function assignSigners(subId: string, assignments: DocSignature[]): Promise<void> {
  const { error } = await supabase.rpc('assign_signers', { sub_id: subId, assignments })
  if (error) throw error
}
// Assigned signer stamps their saved signature onto a block.
export async function signDocument(subId: string, blockId: string): Promise<void> {
  const { error } = await supabase.rpc('sign_document', { sub_id: subId, block_id: blockId })
  if (error) throw error
}
// Documents where the current user is assigned and still has a pending block.
export async function listMyPendingToSign(uid: string): Promise<Submission[]> {
  const { data } = await supabase.from('submissions').select('*').order('createdAt', { ascending: false })
  return ((data ?? []) as Submission[]).filter(s => (s.signatures ?? []).some(x => x.assignedUid === uid && x.status === 'pending'))
}
export async function countMyPendingToSign(uid: string): Promise<number> {
  return (await listMyPendingToSign(uid)).length
}
// Every document the current user is assigned to (pending or already signed) —
// so signers keep a record of what they signed.
export async function listMyAssigned(uid: string): Promise<Submission[]> {
  const { data } = await supabase.from('submissions').select('*').order('createdAt', { ascending: false })
  return ((data ?? []) as Submission[]).filter(s => (s.signatures ?? []).some(x => x.assignedUid === uid))
}

// Document status derived from its online-signature assignments:
// no assignments = ร่าง, all signed = เซ็นครบ, otherwise = รอเซ็น.
export function subStatus(s: Submission): SubmissionStatus {
  const sigs = s.signatures ?? []
  if (sigs.length === 0) return 'draft'
  return sigs.every(x => x.status === 'signed') ? 'signed' : 'pending'
}
const STATUS_META: Record<SubmissionStatus, { label: string; className: string }> = {
  draft: { label: 'ร่าง', className: 'bg-gray-100 text-gray-600' },
  pending: { label: 'รอลายเซ็น', className: 'bg-amber-100 text-amber-700' },
  signed: { label: 'เซ็นครบ', className: 'bg-green-100 text-green-700' },
}
export function statusMeta(s: SubmissionStatus) { return STATUS_META[s] }

// How many of the assigned signatures are done.
export function signProgress(s: Submission): { signed: number; total: number } {
  const sigs = s.signatures ?? []
  return { signed: sigs.filter(x => x.status === 'signed').length, total: sigs.length }
}
// Display label incl. progress count while waiting for signatures.
export function statusLabel(s: Submission): string {
  const st = subStatus(s)
  if (st === 'pending') { const p = signProgress(s); return `รอลายเซ็น (${p.signed}/${p.total})` }
  return statusMeta(st).label
}

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
