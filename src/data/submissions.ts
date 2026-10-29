import { supabase } from '../lib/supabase'
import type { Submission, SubmissionSummary, SubmissionStatus, DocSignature, SignatureBlock } from '../types/schema'
import { formatDocNumber } from '../shared/docNumber'
import { addVersion } from './versions'
import { deleteAttachmentFiles } from './attachments'
import { notifyPendingSignChanged } from '../shared/pendingSignBus'

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
  const { data: saved, error } = await supabase.from('submissions')
    .update({ header: s.header, items: s.items, totals: s.totals, updatedAt: Date.now() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  // An update the database refuses (not yours, or signed) comes back 204 with no
  // error and no rows — without this check the editor said 'saved' regardless.
  if (!saved?.length) throw new Error('บันทึกไม่ได้ — เอกสารนี้อาจถูกลบ ถูกเซ็นแล้ว หรือไม่ใช่เอกสารของคุณ')
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
export function submissionAmount(s: SubmissionSummary): number {
  const t = s.totals as unknown as { netTotal?: number; grandTotal?: number; totalNet?: number }
  return Number(t?.netTotal ?? t?.grandTotal ?? t?.totalNet) || 0
}

export async function deleteSubmission(id: string): Promise<void> {
  // Attached files have to go first: the storage policies authorise by looking
  // up the parent row, so once the row is gone its files can no longer be
  // removed. That order used to be dangerous — a blocked delete answers 204
  // with no error, so the files were destroyed while the document survived —
  // which is why the delete is now checked by what it returns, not by the
  // absence of an error.
  const { data } = await supabase.from('submissions').select('attachments').eq('id', id).maybeSingle()
  const paths = ((data?.attachments ?? []) as { path: string }[]).map(a => a.path)
  if (paths.length) await deleteAttachmentFiles(paths)
  const { data: gone, error } = await supabase.from('submissions').delete().eq('id', id).select('id')
  if (error) throw error
  if (!gone?.length) throw new Error('ลบเอกสารไม่ได้ — อาจไม่มีสิทธิ์ลบ หรือเอกสารถูกลบไปแล้ว')
  notifyPendingSignChanged() // the document may have been waiting on someone
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
  notifyPendingSignChanged()
}
// Assigned signer stamps their saved signature onto a block.
export async function signDocument(subId: string, blockId: string): Promise<void> {
  const { error } = await supabase.rpc('sign_document', { sub_id: subId, block_id: blockId })
  if (error) throw error
  notifyPendingSignChanged()
}
// The assignment list to send when someone stamps their own signature onto one
// block. assign_signers REPLACES the whole pending set, so every other pending
// assignment has to be sent along or it would be dropped; blocks that are
// already signed are kept by the database itself and must not be resent.
export function assignmentsForSelfSign(
  existing: DocSignature[] | undefined, block: SignatureBlock, me: Signer,
): DocSignature[] {
  const keep = (existing ?? []).filter(x => x.status === 'pending' && x.blockId !== block.id)
  return [...keep, {
    blockId: block.id, blockLabel: block.label,
    assignedUid: me.uid, assignedName: me.name, status: 'pending',
  }]
}
// Put my signature straight onto one block of my own document: assign the block
// to myself, then sign it. Skips the send-for-signing step, which is what the
// admin "sign now" action needs — no extra database function involved.
export async function signBlockAsSelf(sub: SubmissionSummary, block: SignatureBlock, me: Signer): Promise<void> {
  await assignSigners(sub.id, assignmentsForSelfSign(sub.signatures, block, me))
  await signDocument(sub.id, block.id)
}
// May this signature be taken back? The person whose signature it is can, and
// so can the document's owner — matching the check inside unsign_document().
// Only a signature that has actually been put on the document can be removed.
export function canRemoveSignature(sig: DocSignature, myUid: string, ownerUid: string): boolean {
  return sig.status === 'signed' && (sig.assignedUid === myUid || ownerUid === myUid)
}
// Take one signature back off a document — the line goes blank again and can be
// signed again or sent to someone else. Everyone else's signatures stay put
// (unlike cancelSigning, which clears the whole document).
export async function unsignDocument(subId: string, blockId: string): Promise<void> {
  const { error } = await supabase.rpc('unsign_document', { sub_id: subId, block_id: blockId })
  if (error) throw error
  notifyPendingSignChanged()
}
// Owner recalls a document from signing — clears all assignments (back to draft).
export async function cancelSigning(subId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_signing', { sub_id: subId })
  if (error) throw error
  notifyPendingSignChanged()
}
// ----- Cancelling a document -----
// A document found wrong after it was signed is cancelled rather than deleted:
// it stays as a record, marked ยกเลิก with the reason, and — when a corrected
// one was made — linked to it both ways (void_submission in
// supabase/2026-10-28-void-documents.sql).
export async function voidSubmission(subId: string, reason: string, replacedBy?: string): Promise<void> {
  const { error } = await supabase.rpc('void_submission', { sub_id: subId, reason, replaced_by: replacedBy ?? null })
  if (error) throw voidError(error)
  notifyPendingSignChanged() // anyone still asked to sign it no longer is
}
// Cancelled by mistake: an admin brings it back.
export async function unvoidSubmission(subId: string): Promise<void> {
  const { error } = await supabase.rpc('unvoid_submission', { sub_id: subId })
  if (error) throw voidError(error)
}
// Before the SQL has been run the function does not exist yet.
function voidError(e: { code?: string; message?: string }): Error {
  const missing = e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message ?? '')
  return new Error(missing ? 'ระบบยังไม่พร้อมยกเลิกเอกสาร — ผู้ดูแลระบบต้องรัน supabase/2026-10-28-void-documents.sql ก่อน' : (e.message || 'เกิดข้อผิดพลาด'))
}
export function isVoided(s: Pick<SubmissionSummary, 'voided'>): boolean {
  return !!s.voided
}

// ----- Document lists -----
// Columns the lists show. Item rows and attachments are only needed on the
// document itself, so lists skip them.
const LIST_COLS = 'id,formType,docNumber,header,totals,createdBy,createdByEmployeeId,createdAt,updatedAt,printCount,lastPrintedAt'
// voided/replaces arrive with supabase/2026-10-28-void-documents.sql; until it
// is run the lists load without them.
let hasVoidCols = true
// Whether cancelling is set up in the database. Assumed so until a list,
// loading, finds the columns missing; from then on the screens offer no way to
// cancel or correct a signed document.
export function voidingAvailable(): boolean { return hasVoidCols }
// Every signed block carries a full copy of the signer's image, far too heavy to
// download for a whole list. signatures_light() (supabase/2026-09-11-list-performance.sql)
// returns the array without the images; until that SQL has been run, fall back
// to the full column.
let hasLightSigs = true

function listQuery(cols: string) { return supabase.from('submissions').select(cols) }
type ListQuery = ReturnType<typeof listQuery>

async function listRows(refine: (q: ListQuery) => ListQuery): Promise<SubmissionSummary[]> {
  for (;;) {
    const cols = `${LIST_COLS}${hasVoidCols ? ',voided,replaces' : ''},signatures${hasLightSigs ? ':signatures_light' : ''}`
    const { data, error } = await refine(listQuery(cols))
    if (!error) return (data ?? []) as unknown as SubmissionSummary[]
    // A column or function not installed yet: drop it and ask again.
    if (error.code === '42703' && /void|replaces/i.test(error.message ?? '') && hasVoidCols) { hasVoidCols = false; continue }
    if (error.code === '42703' && hasLightSigs) { hasLightSigs = false; continue }
    if (error.code === '42703' && hasVoidCols) { hasVoidCols = false; continue }
    return []
  }
}
// jsonb containment on signatures: the database does the matching.
const signedBy = (entry: Partial<DocSignature>) => JSON.stringify([entry])

// How many documents wait for the current user's signature (sidebar badge) —
// counted in the database, no rows downloaded.
export async function countMyPendingToSign(uid: string): Promise<number> {
  const { count } = await supabase.from('submissions').select('id', { count: 'exact', head: true })
    .contains('signatures', signedBy({ assignedUid: uid, status: 'pending' }))
  return count ?? 0
}
// Every document the current user is assigned to (pending or already signed) —
// so signers keep a record of what they signed.
export async function listMyAssigned(uid: string): Promise<SubmissionSummary[]> {
  return listRows(q => q.contains('signatures', signedBy({ assignedUid: uid })).order('createdAt', { ascending: false }))
}

// True once anybody has actually signed. From that moment the document is a
// record: its content is locked in the database (protect_signed_content), and
// correcting it means taking the signature off first.
export function isSigned(s: SubmissionSummary): boolean {
  return (s.signatures ?? []).some(x => x.status === 'signed')
}

// True while a document carries no signature assignments at all — the state in
// which its owner may still freely edit or delete it.
export function isUnsigned(s: SubmissionSummary): boolean {
  return (s.signatures ?? []).length === 0
}

// True when the requester is the only person on the document — their own line,
// stamped as they saved it, with everyone else signing in pen. Nobody else is
// waiting on it or has put their name to it, so the requester may still take
// their signature off to correct the document, or delete it.
export function onlyOwnerSigns(s: Pick<SubmissionSummary, 'signatures' | 'createdBy'>): boolean {
  const sigs = s.signatures ?? []
  return sigs.length > 0 && sigs.every(x => x.assignedUid === s.createdBy)
}

// Whether some line of the form is still unsigned — so the document can go out
// to someone for it. Not the status: a document the requester signed as it was
// saved reads "signed", yet the head's line is still empty.
export function hasUnsignedLine(s: Pick<SubmissionSummary, 'signatures'>, blocks: SignatureBlock[]): boolean {
  const signed = new Set((s.signatures ?? []).filter(x => x.status === 'signed').map(x => x.blockId))
  return blocks.some(b => !signed.has(b.id))
}

// Document status from its signature assignments alone. Sending for signatures
// is optional, so a document nobody was asked to sign is simply saved — called
// "บันทึกแล้ว", not "เสร็จสิ้น", which read as if nothing more was to be done.
//   none          -> บันทึกแล้ว
//   some pending  -> รอลายเซ็น
//   all signed    -> เซ็นครบ (ผู้เบิกเซ็นแล้ว when the requester is the only one)
export function subStatus(s: SubmissionSummary): SubmissionStatus {
  if (s.voided) return 'void'
  const sigs = s.signatures ?? []
  if (sigs.length === 0) return 'done'
  return sigs.every(x => x.status === 'signed') ? 'signed' : 'pending'
}
const STATUS_META: Record<SubmissionStatus, { label: string; className: string }> = {
  done: { label: 'บันทึกแล้ว', className: 'bg-clay-50 text-clay-700' },
  pending: { label: 'รอลายเซ็น', className: 'bg-ochre-50 text-ochre-700' },
  signed: { label: 'เซ็นครบ', className: 'bg-olive-50 text-olive-700' },
  void: { label: 'ยกเลิก', className: 'bg-rose-50 text-brick-700' },
}
export function statusMeta(s: SubmissionStatus) { return STATUS_META[s] }

// How many of the assigned signatures are done.
export function signProgress(s: SubmissionSummary): { signed: number; total: number } {
  const sigs = s.signatures ?? []
  return { signed: sigs.filter(x => x.status === 'signed').length, total: sigs.length }
}
// Display label incl. progress count while waiting for signatures.
export function statusLabel(s: SubmissionSummary): string {
  const st = subStatus(s)
  if (st === 'pending') { const p = signProgress(s); return `รอลายเซ็น (${p.signed}/${p.total})` }
  // Signed by the requester alone: the other lines are signed on paper, so
  // "เซ็นครบ" would claim more than the system knows.
  if (st === 'signed' && onlyOwnerSigns(s)) return 'ผู้เบิกเซ็นแล้ว'
  return statusMeta(st).label
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const { data, error } = await supabase.from('submissions').select('*').eq('id', id).maybeSingle()
  // A failed read must not read as 'the document is gone': the save path treats
  // null as 'nothing to update' and would report success without writing.
  if (error) throw error
  return (data as Submission) ?? null
}
export async function listMySubmissions(uid: string): Promise<SubmissionSummary[]> {
  return listRows(q => q.eq('createdBy', uid).order('createdAt', { ascending: false }))
}
export async function listAllSubmissions(): Promise<SubmissionSummary[]> {
  return listRows(q => q.order('createdAt', { ascending: false }))
}
