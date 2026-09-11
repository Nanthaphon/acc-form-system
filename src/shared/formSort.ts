import type { FormSettings } from '../types/schema'

export type FormSortKey = 'name' | 'createdAt' | 'updatedAt'
export type SortDir = 'asc' | 'desc'

export const FORM_SORT_LABELS: Record<FormSortKey, string> = {
  name: 'ชื่อฟอร์ม',
  createdAt: 'วันที่สร้าง',
  updatedAt: 'วันที่แก้ไข',
}

export const formDisplayName = (f: FormSettings) => f.name || f.title || ''

const byName = (a: FormSettings, b: FormSettings) =>
  formDisplayName(a).localeCompare(formDisplayName(b), 'th', { numeric: true, sensitivity: 'base' })

// Filter forms by a name search, then sort by the chosen key and direction.
// Forms created before the date columns existed carry 0 and sort as oldest;
// ties (same date) always fall back to name A→Z so the order stays stable.
export function filterAndSortForms(forms: FormSettings[], query: string, key: FormSortKey, dir: SortDir): FormSettings[] {
  const needle = query.trim().toLowerCase()
  const matched = needle
    ? forms.filter(f => `${formDisplayName(f)} ${f.formCode ?? ''}`.toLowerCase().includes(needle))
    : forms
  const sign = dir === 'asc' ? 1 : -1
  return [...matched].sort((a, b) => {
    const primary = key === 'name' ? byName(a, b) : (a[key] ?? 0) - (b[key] ?? 0)
    return primary !== 0 ? primary * sign : byName(a, b)
  })
}
