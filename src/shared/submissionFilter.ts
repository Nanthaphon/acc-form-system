import type { Submission } from '../types/schema'
import { subStatus } from '../data/submissions'

export interface Filters {
  q: string          // search: doc number / employee name
  formType: string   // '' = all
  status: string     // '' = all
  emp: string        // employeeId; '' = all (only used where an employee filter is shown)
  datePreset: string // all | today | thisMonth | lastMonth | thisYear | custom
  fromD: string      // ISO yyyy-mm-dd (custom)
  toD: string
}

export const emptyFilters: Filters = { q: '', formType: '', status: '', emp: '', datePreset: 'all', fromD: '', toD: '' }

export function dateBounds(f: Filters): [number, number] {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  switch (f.datePreset) {
    case 'today': return [startOfDay(now), startOfDay(now) + 86400000 - 1]
    case 'thisMonth': return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime() - 1]
    case 'lastMonth': return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime() - 1]
    case 'thisYear': return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime() - 1]
    case 'custom': return [
      f.fromD ? new Date(f.fromD + 'T00:00:00').getTime() : -Infinity,
      f.toD ? new Date(f.toD + 'T23:59:59.999').getTime() : Infinity,
    ]
    default: return [-Infinity, Infinity]
  }
}

export function applyFilters(rows: Submission[], f: Filters, empName: (eid: string) => string): Submission[] {
  const [dStart, dEnd] = dateBounds(f)
  const needle = f.q.trim().toLowerCase()
  return rows.filter(r => {
    if (f.emp && r.createdByEmployeeId !== f.emp) return false
    if (f.formType && r.formType !== f.formType) return false
    if (f.status && subStatus(r) !== f.status) return false
    if (r.createdAt < dStart || r.createdAt > dEnd) return false
    if (needle) {
      const hay = `${r.docNumber} ${empName(r.createdByEmployeeId)} ${r.createdByEmployeeId}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
}
