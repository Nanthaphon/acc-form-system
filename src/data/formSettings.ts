import { supabase } from '../lib/supabase'
import type { FormSettings } from '../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../types/schema'

export async function getFormSettings(formType: string): Promise<FormSettings> {
  const { data } = await supabase.from('form_settings').select('*').eq('formType', formType).maybeSingle()
  if (!data) return EXPENSE_CLAIM_DEFAULTS
  const fs = data as FormSettings
  // Fall back to default columns when the stored `columns` is empty/missing
  // (e.g. before the `columns jsonb` migration is applied).
  const columns = Array.isArray(fs.columns) && fs.columns.length ? fs.columns : EXPENSE_CLAIM_DEFAULTS.columns
  return { ...fs, columns }
}

export async function updateFormSettings(fs: FormSettings): Promise<void> {
  const { error } = await supabase.from('form_settings').upsert(fs)
  if (error) throw error
}
