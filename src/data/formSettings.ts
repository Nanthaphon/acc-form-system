import { supabase } from '../lib/supabase'
import type { FormSettings } from '../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../types/schema'

// Apply the same columns-fallback as getFormSettings: fall back to the default
// columns when the stored `columns` is empty/missing (e.g. before the migration).
function withColumnsFallback(fs: FormSettings): FormSettings {
  const columns = Array.isArray(fs.columns) && fs.columns.length ? fs.columns : EXPENSE_CLAIM_DEFAULTS.columns
  return { ...fs, columns }
}

export async function getFormSettings(formType: string): Promise<FormSettings> {
  const { data } = await supabase.from('form_settings').select('*').eq('formType', formType).maybeSingle()
  if (!data) return { ...EXPENSE_CLAIM_DEFAULTS, formType }
  return withColumnsFallback(data as FormSettings)
}

export async function listForms(): Promise<FormSettings[]> {
  const { data, error } = await supabase.from('form_settings').select('*')
  // If the query errors or returns nothing, fall back to the built-in form so
  // the app still shows something to fill.
  if (error || !data || data.length === 0) return [EXPENSE_CLAIM_DEFAULTS]
  return (data as FormSettings[]).map(withColumnsFallback)
}

export async function createForm(name: string, groupId: string): Promise<string> {
  const newId = crypto.randomUUID()
  const row: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, formType: newId, name, groupId, formCode: '' }
  const { error } = await supabase.from('form_settings').upsert(row)
  if (error) throw error
  return newId
}

export async function deleteForm(formType: string): Promise<void> {
  const { error } = await supabase.from('form_settings').delete().eq('formType', formType)
  if (error) throw error
}

export async function updateFormSettings(fs: FormSettings): Promise<void> {
  const { error } = await supabase.from('form_settings').upsert(fs)
  if (error) throw error
}
