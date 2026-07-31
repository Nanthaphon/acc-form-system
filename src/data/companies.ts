import { supabase } from '../lib/supabase'
import type { Company } from '../types/schema'

export async function getCompany(id: string): Promise<Company | null> {
  const { data } = await supabase.from('companies').select('*').eq('id', id).maybeSingle()
  return (data as Company) ?? null
}
export async function listCompanies(): Promise<Company[]> {
  const { data } = await supabase.from('companies').select('*').order('name')
  return (data ?? []) as Company[]
}
export async function upsertCompany(c: Company): Promise<void> {
  const { error } = await supabase.from('companies').upsert(c)
  if (error) throw error
}
export async function updateCompanyLogo(id: string, logo: string | null): Promise<void> {
  const { error } = await supabase.from('companies').update({ logo }).eq('id', id)
  if (error) throw error
}
