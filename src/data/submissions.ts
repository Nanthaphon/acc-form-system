import { supabase } from '../lib/supabase'
import type { Submission } from '../types/schema'
import { formatDocNumber } from '../shared/docNumber'

export type SubmissionDraft = Omit<Submission,
  'id' | 'docNumber' | 'createdAt' | 'updatedAt' | 'printCount' | 'lastPrintedAt'>

export async function createSubmission(dr: SubmissionDraft, docPrefix: string): Promise<Submission> {
  const now = Date.now()
  const { data: seq, error } = await supabase.rpc('next_doc_number', { form_type: dr.formType })
  if (error) throw error
  const docNumber = formatDocNumber(docPrefix, new Date(now), seq as number)
  const row = { ...dr, docNumber, createdAt: now, updatedAt: now, printCount: 0, lastPrintedAt: null }
  const { data, error: e2 } = await supabase.from('submissions').insert(row).select().single()
  if (e2) throw e2
  return data as Submission
}
export async function updateSubmission(id: string, s: Submission): Promise<void> {
  const { error } = await supabase.from('submissions')
    .update({ header: s.header, items: s.items, totals: s.totals, updatedAt: Date.now() })
    .eq('id', id)
  if (error) throw error
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
