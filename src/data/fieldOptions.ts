import { supabase } from '../lib/supabase'

// Custom Field: the list of values an employee field may take. A field with
// no values stays free text, so a list only ever narrows a field once an
// admin has decided it should (supabase/2026-09-25-field-options.sql).

export type OptionField = 'department' | 'position'

export const OPTION_FIELDS: { key: OptionField; label: string }[] = [
  { key: 'department', label: 'แผนก' },
  { key: 'position', label: 'ตำแหน่ง' },
]

export interface FieldOption {
  id: string
  field: OptionField
  value: string
  sortOrder: number
  createdAt: number
}

export type OptionLists = Record<OptionField, string[]>

export const NO_OPTIONS: OptionLists = { department: [], position: [] }

/** True when the error only means the migration above has not been run yet. */
export function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code
  return code === '42P01' || code === 'PGRST205'
}

/** Every value of every field, in order. Throws, so the admin page can tell a
 *  missing table from an empty list. */
export async function listFieldOptions(): Promise<FieldOption[]> {
  const { data, error } = await supabase
    .from('field_options')
    .select('*')
    .order('sortOrder', { ascending: true })
    .order('value', { ascending: true })
  if (error) throw error
  return (data ?? []) as FieldOption[]
}

/** The values per field, for a form. Any failure — including the table not
 *  existing yet — is an empty list, which is to say the field stays free text
 *  and the form works exactly as it did before this feature. */
export async function loadOptionLists(): Promise<OptionLists> {
  try {
    const rows = await listFieldOptions()
    const lists: OptionLists = { department: [], position: [] }
    for (const r of rows) lists[r.field]?.push(r.value)
    return lists
  } catch {
    return NO_OPTIONS
  }
}

export async function addFieldOption(field: OptionField, value: string): Promise<void> {
  const row = { field, value: value.trim(), sortOrder: Math.floor(Date.now() / 1000) }
  const { error } = await supabase.from('field_options').insert(row)
  if (error) throw error
}

/** Renames the value on the list and on every employee who has it. */
export async function renameFieldOption(id: string, value: string): Promise<void> {
  const { error } = await supabase.rpc('rename_field_option', { opt_id: id, new_value: value.trim() })
  if (error) throw error
}

/** Removes the value from the list only. Employees who have it keep it. */
export async function deleteFieldOption(id: string): Promise<void> {
  const { error } = await supabase.from('field_options').delete().eq('id', id)
  if (error) throw error
}

/** How many employees hold each value, per field — including values that are
 *  in use but not on the list, which is how an admin finds what to add. */
export async function fieldUsage(): Promise<Record<OptionField, Map<string, number>>> {
  const { data } = await supabase.from('profiles').select('department,position')
  const usage: Record<OptionField, Map<string, number>> = { department: new Map(), position: new Map() }
  for (const p of (data ?? []) as Record<OptionField, string | null>[]) {
    for (const { key } of OPTION_FIELDS) {
      const v = (p[key] ?? '').trim()
      if (v) usage[key].set(v, (usage[key].get(v) ?? 0) + 1)
    }
  }
  return usage
}

/** The canonical spelling of `typed` on `list`, ignoring case and spacing. */
export function matchOption(list: string[], typed: string): string | undefined {
  const want = typed.trim().toLowerCase()
  return list.find(v => v.trim().toLowerCase() === want)
}
