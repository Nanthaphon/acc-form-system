import type { ExpenseHeader, ExpenseRow, ExpenseTotals, FormColumn } from '../types/schema'
import { formatIsoDate } from './date'

interface Snap { header: ExpenseHeader; items: ExpenseRow[]; totals: ExpenseTotals }

const HEADER_LABELS: [keyof ExpenseHeader, string][] = [
  ['firstName', 'ชื่อผู้เบิก'], ['lastName', 'นามสกุลผู้เบิก'], ['position', 'ตำแหน่ง'], ['job', 'Job'], ['subject', 'เรื่อง'],
]

function cellText(col: FormColumn, v: unknown): string {
  if (col.type === 'date') return formatIsoDate(String(v ?? ''))
  if (col.type === 'number' || col.type === 'calc') return String(v ?? 0)
  return String(v ?? '')
}

// Human-readable, cell-level list of what changed from `prev` to `curr`.
export function describeChanges(prev: Snap, curr: Snap, columns: FormColumn[]): string[] {
  const out: string[] = []

  for (const [k, label] of HEADER_LABELS) {
    const a = String(prev.header[k] ?? ''), b = String(curr.header[k] ?? '')
    if (a !== b) out.push(`${label}: ${a || '—'} → ${b || '—'}`)
  }
  const pc = (prev.header.categories ?? []).join(', '), cc = (curr.header.categories ?? []).join(', ')
  if (pc !== cc) out.push(`ประเภทค่าใช้จ่าย: ${pc || '—'} → ${cc || '—'}`)

  const pn = prev.items.length, cn = curr.items.length, common = Math.min(pn, cn)
  for (let i = 0; i < common; i++) {
    for (const col of columns) {
      if (col.type === 'calc') continue // computed automatically — not a manual edit
      const a = cellText(col, prev.items[i]?.[col.key]), b = cellText(col, curr.items[i]?.[col.key])
      if (a !== b) out.push(`รายการที่ ${i + 1}: ${col.label} ${a || '—'} → ${b || '—'}`)
    }
  }
  for (let i = common; i < cn; i++) out.push(`เพิ่มรายการที่ ${i + 1}`)
  for (let i = common; i < pn; i++) out.push(`ลบรายการที่ ${i + 1}`)

  const pg = prev.totals?.grandTotal ?? 0, cg = curr.totals?.grandTotal ?? 0
  if (pg !== cg) out.push(`ยอดรวม ${pg.toLocaleString()} → ${cg.toLocaleString()}`)

  return out
}
