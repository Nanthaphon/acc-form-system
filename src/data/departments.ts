import { supabase } from '../lib/supabase'
import type { Department } from '../types/schema'

export async function listDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from('departments').select('*').order('sortOrder', { ascending: true })
  if (error || !data) return []
  return data as Department[]
}

export async function createDepartment(name: string): Promise<string> {
  const id = crypto.randomUUID()
  // sortOrder is an int4 column — use seconds (fits int4); createdAt keeps ms (bigint).
  const row: Department = { id, name, sortOrder: Math.floor(Date.now() / 1000), createdAt: Date.now() }
  const { error } = await supabase.from('departments').insert(row)
  if (error) throw error
  return id
}

export async function renameDepartment(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('departments').update({ name }).eq('id', id)
  if (error) throw error
}

// How many employees are still in this department (used to block deletion so we
// never leave an employee pointing at a department that no longer exists).
export async function departmentUsage(id: string): Promise<number> {
  const { count } = await supabase.from('profiles').select('uid', { count: 'exact', head: true }).eq('departmentId', id)
  return count ?? 0
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}
