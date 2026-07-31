import type { FormColumn, ExpenseRow } from '../../types/schema'
import { bahtText } from '../../shared/bahttext'

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Columns to DISPLAY (calc still uses the full columns array).
export function visibleColumns(columns: FormColumn[]): FormColumn[] {
  return columns.filter(c => !c.hidden)
}

// Compute every calc column (in array order) from its calc def.
// Later calc columns can reference earlier (already-computed) calc columns.
export function computeRow(columns: FormColumn[], row: ExpenseRow): ExpenseRow {
  const out: ExpenseRow = { ...row }
  const num = (key: string): number => Number(out[key]) || 0
  for (const col of columns) {
    if (col.type !== 'calc' || !col.calc) continue
    const { op, a, b, percent } = col.calc
    let value = 0
    switch (op) {
      case 'multiply': value = num(a) * num(b ?? ''); break
      case 'add': value = num(a) + num(b ?? ''); break
      case 'subtract': value = num(a) - num(b ?? ''); break
      case 'percent': value = num(a) * (percent ?? 0) / 100; break
    }
    out[col.key] = round2(value)
  }
  return out
}

// Sum each number/calc column across all computed rows.
export function computeColumnTotals(columns: FormColumn[], rows: ExpenseRow[]): Record<string, number> {
  const computed = rows.map(r => computeRow(columns, r))
  const totals: Record<string, number> = {}
  for (const col of columns) {
    if (col.type === 'text') continue
    totals[col.key] = round2(computed.reduce((s, r) => s + (Number(r[col.key]) || 0), 0))
  }
  return totals
}

// The grand total = column-sum of the isTotal column (fallback: last calc column, else 0).
export function grandTotal(columns: FormColumn[], rows: ExpenseRow[]): number {
  const totals = computeColumnTotals(columns, rows)
  // Only a numeric/calc column can be the grand total. Ignore an isTotal flag
  // that landed on a text column, and fall back to the last calc/number column.
  const totalCol = columns.find(c => c.isTotal && c.type !== 'text')
    ?? [...columns].reverse().find(c => c.type === 'calc')
    ?? [...columns].reverse().find(c => c.type === 'number')
  if (!totalCol) return 0
  return round2(totals[totalCol.key] ?? 0)
}

export function bahtTextForRows(columns: FormColumn[], rows: ExpenseRow[]): string {
  return bahtText(grandTotal(columns, rows))
}
