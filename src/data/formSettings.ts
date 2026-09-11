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

type WriteResult = PromiseLike<{ error: { code?: string; message: string } | null }>

// A pending migration can leave the database without a column the app already
// writes. Rather than fail the whole save, retry without each column the API
// reports missing (PGRST204) and return the names of the skipped columns.
export async function writeSkippingMissing(
  write: (row: Record<string, unknown>) => WriteResult,
  row: Record<string, unknown>,
): Promise<string[]> {
  const skipped: string[] = []
  let r = { ...row }
  for (;;) {
    const { error } = await write(r)
    if (!error) return skipped
    const col = error.code === 'PGRST204' ? /'([^']+)' column/.exec(error.message)?.[1] : undefined
    if (!col || !(col in r)) throw error
    skipped.push(col)
    const { [col]: _dropped, ...rest } = r
    r = rest
  }
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
  const now = Date.now()
  const row: FormSettings = {
    formType: newId, name, title: name, groupId,
    subject: '', attention: '', formCode: '',
    categories: [], notes: [], columns: [],
    createdAt: now, updatedAt: now,
  }
  await writeSkippingMissing(r => supabase.from('form_settings').upsert(r), { ...row })
  return newId
}

export async function renameForm(formType: string, name: string): Promise<void> {
  // Keep the document title (หัวเอกสาร) in sync with the form name.
  await writeSkippingMissing(r => supabase.from('form_settings').update(r).eq('formType', formType),
    { name, title: name, updatedAt: Date.now() })
}

export async function deleteForm(formType: string): Promise<void> {
  const { error } = await supabase.from('form_settings').delete().eq('formType', formType)
  if (error) throw error
}

// Saves a form's settings. Returns the columns the database doesn't have yet
// (skipped) so the caller can tell the admin what wasn't stored.
export async function updateFormSettings(fs: FormSettings): Promise<string[]> {
  const skipped = await writeSkippingMissing(r => supabase.from('form_settings').upsert(r), { ...fs, updatedAt: Date.now() })
  // Without the multi-group column, keep the first chosen group in the old single field.
  if (skipped.includes('accessGroups')) {
    const { error } = await supabase.from('form_settings')
      .update({ accessGroup: fs.accessGroups?.[0] ?? null }).eq('formType', fs.formType)
    if (error) throw error
  }
  return skipped
}

// Turn a form on/off. When off, employees don't see it (maintenance mode).
export async function setFormActive(formType: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('form_settings').update({ active }).eq('formType', formType)
  if (error) throw error
}
