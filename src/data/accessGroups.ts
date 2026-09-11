import { supabase } from '../lib/supabase'
import type { AccessGroup } from '../types/schema'
import { ACCESS_GROUPS } from '../types/schema'

// Seed/fallback used before the `access_groups` migration runs (or if empty),
// so every dropdown still shows the original two groups.
const FALLBACK: AccessGroup[] = ACCESS_GROUPS.map((g, i) => ({ ...g, sortOrder: i, createdAt: 0 }))

export async function listAccessGroups(): Promise<AccessGroup[]> {
  const { data, error } = await supabase.from('access_groups').select('*').order('sortOrder', { ascending: true })
  if (error || !data || data.length === 0) return FALLBACK
  return data as AccessGroup[]
}

export async function createAccessGroup(name: string): Promise<string> {
  const id = crypto.randomUUID()
  // sortOrder is an int4 column — use seconds (fits int4); createdAt keeps ms (bigint).
  const row: AccessGroup = { id, name, sortOrder: Math.floor(Date.now() / 1000), createdAt: Date.now() }
  const { error } = await supabase.from('access_groups').insert(row)
  if (error) throw error
  return id
}

export async function renameAccessGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('access_groups').update({ name }).eq('id', id)
  if (error) throw error
}

// How many employees / forms still reference this group (used to block deletion
// so we never leave employees or forms pointing at a group that no longer exists).
export async function accessGroupUsage(id: string): Promise<{ employees: number; forms: number }> {
  // Forms reference a group through the multi-group list, or through the legacy
  // single field on forms not re-saved since; count each form once.
  const [emp, listed, legacy] = await Promise.all([
    supabase.from('profiles').select('uid', { count: 'exact', head: true }).eq('accessGroup', id),
    supabase.from('form_settings').select('formType').contains('accessGroups', JSON.stringify([id])), // jsonb: an array would be sent as a Postgres {…} literal
    supabase.from('form_settings').select('formType').eq('accessGroup', id),
  ])
  const forms = new Set([...(listed.data ?? []), ...(legacy.data ?? [])].map(f => f.formType as string))
  return { employees: emp.count ?? 0, forms: forms.size }
}

export async function deleteAccessGroup(id: string): Promise<void> {
  const { error } = await supabase.from('access_groups').delete().eq('id', id)
  if (error) throw error
}
