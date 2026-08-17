import { supabase } from '../lib/supabase'
import type { FormSettings } from '../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../types/schema'

// Only the built-in expense-claim form falls back to the default columns when its
// stored `columns` is empty. Custom forms start BLANK and keep their (empty) columns.
function withColumnsFallback(fs: FormSettings): FormSettings {
  if (Array.isArray(fs.columns) && fs.columns.length) return fs
  if (fs.formType === 'expense-claim') return { ...fs, columns: EXPENSE_CLAIM_DEFAULTS.columns }
  return { ...fs, columns: Array.isArray(fs.columns) ? fs.columns : [] }
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
  // New form starts BLANK — no columns/categories/notes. Admin builds it up.
  // Document title (หัวเอกสาร) starts equal to the form name.
  const row: FormSettings = {
    formType: newId, name, title: name, groupId,
    subject: '', attention: '', formCode: '',
    categories: [], notes: [], columns: [],
  }
  const { error } = await supabase.from('form_settings').upsert(row)
  if (error) throw error
  return newId
}

export async function renameForm(formType: string, name: string): Promise<void> {
  // Keep the document title (หัวเอกสาร) in sync with the form name.
  const { error } = await supabase.from('form_settings').update({ name, title: name }).eq('formType', formType)
  if (error) throw error
}

export async function deleteForm(formType: string): Promise<void> {
  const { error } = await supabase.from('form_settings').delete().eq('formType', formType)
  if (error) throw error
}

export async function updateFormSettings(fs: FormSettings): Promise<void> {
  const { error } = await supabase.from('form_settings').upsert(fs)
  if (error) throw error
}

// Turn a form on/off. When off, employees don't see it (maintenance mode).
export async function setFormActive(formType: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('form_settings').update({ active }).eq('formType', formType)
  if (error) throw error
}
