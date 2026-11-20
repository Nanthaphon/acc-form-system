import { supabase } from '../lib/supabase'
import { cached, invalidate, MINUTE } from '../shared/cache'
import type { FormGroup } from '../types/schema'
import { orderFolders } from '../shared/folders'

export function listGroups(): Promise<FormGroup[]> {
  return cached('formGroups', 5 * MINUTE, () => fetchGroups())
}
async function fetchGroups(): Promise<FormGroup[]> {
  const { data, error } = await supabase.from('form_groups').select('*').order('sortOrder', { ascending: true })
  // Never invent a folder: a phantom one hides the real folders when a read
  // fails, and blocks deleting the last real folder.
  if (error || !data) return []
  return orderFolders(data as FormGroup[])
}

// parentId: create it as a sub-folder of that folder.
export async function createGroup(name: string, parentId?: string): Promise<string> {
  invalidate('formGroups')
  const id = crypto.randomUUID()
  // sortOrder is an int4 column — use seconds (fits int4), createdAt keeps ms (bigint).
  const row: FormGroup = { id, name, sortOrder: Math.floor(Date.now() / 1000), createdAt: Date.now(), ...(parentId ? { parentId } : {}) }
  const { error } = await supabase.from('form_groups').insert(row)
  if (error) throw error
  return id
}

export async function renameGroup(id: string, name: string): Promise<void> {
  invalidate('formGroups')
  const { error } = await supabase.from('form_groups').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteGroup(id: string): Promise<void> {
  invalidate('formGroups')
  const { error } = await supabase.from('form_groups').delete().eq('id', id)
  if (error) throw error
}

// Turn a folder on/off. When off, employees don't see it or any form inside it.
export async function setGroupActive(id: string, active: boolean): Promise<void> {
  invalidate('formGroups')
  const { error } = await supabase.from('form_groups').update({ active }).eq('id', id)
  if (error) throw error
}
