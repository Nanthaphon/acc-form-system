import { supabase } from '../lib/supabase'
import type { FormSettings } from '../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../types/schema'

export async function getFormSettings(formType: string): Promise<FormSettings> {
  const { data } = await supabase.from('form_settings').select('*').eq('formType', formType).maybeSingle()
  return (data as FormSettings) ?? EXPENSE_CLAIM_DEFAULTS
}

export async function updateFormSettings(fs: FormSettings): Promise<void> {
  const { error } = await supabase.from('form_settings').upsert(fs)
  if (error) throw error
}
