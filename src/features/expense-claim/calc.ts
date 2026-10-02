import type { FormColumn, ExpenseRow } from '../../types/schema'
import { calcOperands, isTextCol } from '../../types/schema'
import { bahtText } from '../../shared/bahttext'

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Columns to DISPLAY (calc still uses the full columns array).
export function visibleColumns(columns: FormColumn[]): FormColumn[] {
  return columns.filter(c => !c.hidden)
}

// Compute every calc column from its calc def.
// A formula may name a calc column that sits later in the table: the values are
// resolved repeatedly until nothing changes, so where a column sits on screen
// never changes the number. A formula that refers back to itself settles at 0.
function evalCalc(col: FormColumn, out: ExpenseRow): number {
  const num = (key: string): number => Number(out[key]) || 0
  const { op, percent } = col.calc!
  const ops = calcOperands(col.calc!)
  switch (op) {
    case 'multiply': return round2(ops.length ? ops.reduce((acc, k) => acc * num(k), 1) : 0)
    case 'add': return round2(ops.reduce((acc, k) => acc + num(k), 0))
    case 'subtract': return round2(ops.reduce((acc, k, i) => i === 0 ? num(k) : acc - num(k), 0))
    case 'divide': return round2(ops.reduce((acc, k, i) => i === 0 ? num(k) : (num(k) === 0 ? acc : acc / num(k)), 0))
    case 'percent': return round2(num(ops[0] ?? '') * (percent ?? 0) / 100)
  }
  return 0
}

export function computeRow(columns: FormColumn[], row: ExpenseRow): ExpenseRow {
  const out: ExpenseRow = { ...row }
  const calcCols = columns.filter(c => c.type === 'calc' && c.calc)
  for (let pass = 0; pass < calcCols.length; pass++) {
    let changed = false
    for (const col of calcCols) {
      const value = evalCalc(col, out)
      if (out[col.key] !== value) { out[col.key] = value; changed = true }
    }
    if (!changed) break
  }
  return out
}

// Sum each number/calc column across all computed rows.
export function computeColumnTotals(columns: FormColumn[], rows: ExpenseRow[]): Record<string, number> {
  const computed = rows.map(r => computeRow(columns, r))
  const totals: Record<string, number> = {}
  for (const col of columns) {
    if (isTextCol(col.type)) continue
    totals[col.key] = round2(computed.reduce((s, r) => s + (Number(r[col.key]) || 0), 0))
  }
  return totals
}

// The column whose sum is the document total — what the tax, the net and the
// baht text are all computed from. Marked with isTotal; a form that never marked
// one falls back to the last calc column, then the last number column. Only a
// numeric column can be it, so an isTotal left on a text column is ignored.
export function totalColumn(columns: FormColumn[]): FormColumn | undefined {
  return columns.find(c => c.isTotal && !isTextCol(c.type))
    ?? [...columns].reverse().find(c => c.type === 'calc')
    ?? [...columns].reverse().find(c => c.type === 'number')
}

export function grandTotal(columns: FormColumn[], rows: ExpenseRow[]): number {
  const totals = computeColumnTotals(columns, rows)
  const totalCol = totalColumn(columns)
  if (!totalCol) return 0
  return round2(totals[totalCol.key] ?? 0)
}

export function bahtTextForRows(columns: FormColumn[], rows: ExpenseRow[]): string {
  return bahtText(grandTotal(columns, rows))
}

// VAT (7%), withholding tax and ค่าประกันงาน are all computed on the items
// subtotal (pre-VAT), the standard Thai basis.
// Net = subtotal + VAT − withholding − retention.
export interface TaxResult { subtotal: number; vatAmount: number; whtAmount: number; retentionAmount: number; netTotal: number }
export function taxSummary(subtotal: number, vat?: boolean, whtRate?: number, retentionRate?: number): TaxResult {
  const vatAmount = vat ? round2(subtotal * 0.07) : 0
  const whtAmount = whtRate ? round2(subtotal * whtRate / 100) : 0
  // ค่าประกันงาน (retention) is held back on the pre-VAT amount, like withholding.
  const retentionAmount = retentionRate ? round2(subtotal * retentionRate / 100) : 0
  const netTotal = round2(subtotal + vatAmount - whtAmount - retentionAmount)
  return { subtotal, vatAmount, whtAmount, retentionAmount, netTotal }
}

// ----- Printed column widths -----
// A width is a real measurement in millimetres on the sheet. The table lives
// inside an A4 page (210mm) less its 10mm margins and the frame padding.
export const PRINT_TABLE_MM = 177
// A column left to share the leftover never collapses below this.
const AUTO_MIN_MM = 12
export const PX_PER_MM = 96 / 25.4

// What each column actually gets on paper, in millimetres: a width that was set
// is honoured as typed, columns left blank share what is left over, and if every
// column is set but the table would stop short, the last one takes the rest so
// the table still meets the frame. Anything over the page is scaled down to fit.
export function printWidthsMm(
  seqMm: number, widths: (number | undefined)[], budget = PRINT_TABLE_MM,
): { seq: number; cols: number[] } {
  const fixedTotal = seqMm + widths.reduce((sum: number, w) => sum + (w ?? 0), 0)
  const autoCount = widths.filter(w => !w).length
  let cols: number[]
  if (autoCount > 0) {
    const share = Math.max((budget - fixedTotal) / autoCount, AUTO_MIN_MM)
    cols = widths.map(w => w || share)
  } else {
    cols = widths.map(w => w as number)
    const slack = budget - fixedTotal
    if (slack > 0 && cols.length > 0) cols[cols.length - 1] += slack
  }
  const total = seqMm + cols.reduce((sum, w) => sum + w, 0)
  if (total > budget && total > 0) {
    const scale = budget / total
    return { seq: seqMm * scale, cols: cols.map(w => w * scale) }
  }
  return { seq: seqMm, cols }
}

// Fill-in table sizing. The table is `table-fixed`, where a cell's min-width is
// ignored — only an explicit width counts — so the floor has to be applied to
// the width itself, and the table needs its own min-width to overflow (and
// scroll) rather than squeeze every column to a few pixels on a narrow screen.
// Print is unaffected: the preview/PDF size columns proportionally from
// col.width, so the admin's own setting still decides the printed layout.
export const DATE_COL_MIN_PX = 118  // fits "dd/mm/yyyy" plus the calendar button
const COL_MIN_PX = 80       // any other column, when the form sets no width
const SEQ_COL_PX = 32      // the "#" column (w-8)
const ACTION_COL_PX = 36   // the delete-row column (w-9)

// The width a column is rendered at, or undefined to let it flex. A date column
// never goes below DATE_COL_MIN_PX — narrower and its value is unreadable.
export function colWidth(col: FormColumn): number | undefined {
  // The stored width is millimetres of paper; on screen that is pixels.
  const px = col.width ? Math.round(col.width * PX_PER_MM) : undefined
  if (col.type === 'date') return Math.max(px ?? 0, DATE_COL_MIN_PX)
  return px
}
// Width below which the table scrolls instead of shrinking its columns.
export function tableMinWidth(cols: FormColumn[]): number {
  return SEQ_COL_PX + ACTION_COL_PX + cols.reduce((sum, c) => sum + (colWidth(c) ?? COL_MIN_PX), 0)
}
