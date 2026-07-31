import { supabase } from '../lib/supabase'
import type { FormGroup } from '../types/schema'

const DEFAULT_GROUP: FormGroup = { id: 'default', name: 'ฟอร์มทั่วไป', sortOrder: 0, createdAt: 0 }

export async function listGroups(): Promise<FormGroup[]> {
  const { data, error } = await supabase.from('form_groups').select('*').order('sortOrder', { ascending: true })
  // If the table doesn't exist yet / query errors / is empty, fall back to the
  // built-in default group so the dashboard still renders.
  if (error || !data || data.length === 0) return [DEFAULT_GROUP]
  return data as FormGroup[]
}

export async function createGroup(name: string): Promise<string> {
  const id = crypto.randomUUID()
  // sortOrder is an int4 column — use seconds (fits int4), createdAt keeps ms (bigint).
  const row: FormGroup = { id, name, sortOrder: Math.floor(Date.now() / 1000), createdAt: Date.now() }
  const { error } = await supabase.from('form_groups').insert(row)
  if (error) throw error
  return id
}

export async function renameGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('form_groups').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from('form_groups').delete().eq('id', id)
  if (error) throw error
}
