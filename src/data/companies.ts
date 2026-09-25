import { supabase } from '../lib/supabase'
import type { Company } from '../types/schema'

export async function getCompany(id: string): Promise<Company | null> {
  const { data } = await supabase.from('companies').select('*').eq('id', id).maybeSingle()
  return (data as Company) ?? null
}
// Logos are base64 images: only fetched where they're shown or edited
// (getCompany for a document, listCompanies(true) on the form settings page).
export async function listCompanies(withLogo = false): Promise<Company[]> {
  const cols: string = withLogo ? '*' : 'id,name,address,headerName,shortName'
  let { data, error } = await supabase.from('companies').select(cols).order('name')
  // shortName exists only once supabase/2026-09-25-company-short-name.sql has run.
  if (error?.code === '42703') ({ data } = await supabase.from('companies').select(cols.replace(',shortName', '')).order('name'))
  return (data ?? []) as unknown as Company[]
}
export async function upsertCompany(c: Company): Promise<void> {
  const { error } = await supabase.from('companies').upsert(c)
  if (error) throw error
}
export async function updateCompanyLogo(id: string, logo: string | null): Promise<void> {
  const { error } = await supabase.from('companies').update({ logo }).eq('id', id)
  if (error) throw error
}
