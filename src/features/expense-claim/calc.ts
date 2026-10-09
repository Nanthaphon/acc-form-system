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
//
// A product leaves out the cells nobody filled in: วันละ 1,000 with วันทำงาน
// still blank is 1,000, not 0 — the blank reads as "one", the way a rate on
// its own is meant. A 0 someone typed still counts, and a row with none of
// its operands filled stays 0.
function evalCalc(col: FormColumn, out: ExpenseRow): number {
  const num = (key: string): number => Number(out[key]) || 0
  const filled = (key: string): boolean => { const v = out[key]; return v !== '' && v !== undefined && v !== null }
  const { op, percent } = col.calc!
  const ops = calcOperands(col.calc!)
  switch (op) {
    case 'multiply': {
      const given = ops.filter(filled)
      return round2(given.length ? given.reduce((acc, k) => acc * num(k), 1) : 0)
    }
    case 'add': return round2(ops.reduce((acc, k) => acc + num(k), 0))
    case 'subtract': return round2(ops.reduce((acc, k, i) => i === 0 ? num(k) : acc - num(k), 0))
    case 'divide': return round2(ops.reduce((acc, k, i) => i === 0 ? num(k) : (num(k) === 0 ? acc : acc / num(k)), 0))
    case 'percent': return round2(num(ops[0] ?? '') * (percent ?? 0) / 100)
  }
  return 0
}

// Has anyone typed a number into this row? An untouched row shows its calc
// columns blank instead of 0.00 — the paper form leaves those cells empty.
// A form with no number columns has nothing to wait for, so it always shows.
export function rowHasNumbers(columns: FormColumn[], row: ExpenseRow): boolean {
  const nums = columns.filter(c => c.type === 'number')
  if (!nums.length) return true
  return nums.some(c => String(row[c.key] ?? '').trim() !== '')
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

// ----- Tax chosen per row -----
// Some forms charge VAT or withholding tax on SOME lines only — a supplier's
// work is withheld, a hotel bill is not. Those forms (perRowTax) carry a tick
// per row under these reserved keys, which no column can use: a column key is
// generated as col1, col2, … and never holds a colon.
export const ROW_VAT_KEY = 'tax:vat'
export const ROW_WHT_KEY = 'tax:wht'
export function isRowTicked(row: ExpenseRow, key: string): boolean {
  return row[key] === 1 || row[key] === '1'
}
export const TICK = 1
export const UNTICK = ''

// What VAT and withholding are each worked out on. Without perRowTax that is
// the whole subtotal, exactly as before; with it, only the ticked rows count.
export function taxBases(
  columns: FormColumn[], rows: ExpenseRow[], perRowTax?: boolean,
): { vat: number; wht: number } | undefined {
  if (!perRowTax) return undefined
  const totalCol = totalColumn(columns)
  if (!totalCol) return { vat: 0, wht: 0 }
  const sum = (key: string) => round2(rows
    .filter(r => isRowTicked(r, key))
    .reduce((s, r) => s + (Number(computeRow(columns, r)[totalCol.key]) || 0), 0))
  return { vat: sum(ROW_VAT_KEY), wht: sum(ROW_WHT_KEY) }
}

// VAT (7%), withholding tax and ค่าประกันงาน are all computed on the items
// subtotal (pre-VAT), the standard Thai basis — or, on a form that charges them
// per row, on just the rows ticked for each (`bases`).
// Net = subtotal + VAT − withholding − retention.
export interface TaxResult { subtotal: number; vatAmount: number; whtAmount: number; retentionAmount: number; netTotal: number }
export function taxSummary(
  subtotal: number, vat?: boolean, whtRate?: number, retentionRate?: number,
  bases?: { vat: number; wht: number },
): TaxResult {
  const vatAmount = vat ? round2((bases?.vat ?? subtotal) * 0.07) : 0
  const whtAmount = whtRate ? round2((bases?.wht ?? subtotal) * whtRate / 100) : 0
  // ค่าประกันงาน (retention) is held back on the pre-VAT amount, like withholding.
  const retentionAmount = retentionRate ? round2(subtotal * retentionRate / 100) : 0
  const netTotal = round2(subtotal + vatAmount - whtAmount - retentionAmount)
  return { subtotal, vatAmount, whtAmount, retentionAmount, netTotal }
}

// ----- Printed pagination -----
// A sheet holds this many single-line rows under the heading. A row whose text
// wraps takes the space of as many lines, so the count below is a budget of
// LINES, not of rows.
export const PRINT_ROWS_PER_PAGE = 14
// At the printed 10px size a Thai character takes about 2.1mm, and each cell
// keeps ~2mm of padding. Latin letters, digits and punctuation are narrower, so
// they count for a fraction of one — measured against the real sheet, where a
// 37mm column holds ~17 Thai characters a line but a 10-character date fits a
// 20mm one. The estimate is meant to round UP: a line left spare costs nothing,
// while one too few pushes the signatures onto a second sheet.
const THAI_CHAR_MM = 2.1
const NARROW_CHAR_RATIO = 0.55
const CELL_PADDING_MM = 2.2

// Roughly how many Thai-character widths a piece of text takes up.
function textWidth(text: string): number {
  let w = 0
  for (const ch of text) w += ch.charCodeAt(0) < 0x0e00 ? NARROW_CHAR_RATIO : 1
  return w
}

// How many printed lines a row needs: its tallest cell decides.
export function rowLines(widthsMm: number[], texts: string[]): number {
  let lines = 1
  texts.forEach((text, i) => {
    if (!text) return
    const usable = Math.max((widthsMm[i] ?? 0) - CELL_PADDING_MM, THAI_CHAR_MM)
    const perLine = Math.max(1, usable / THAI_CHAR_MM)
    const n = text.split('\n').reduce((sum, part) => sum + Math.max(1, Math.ceil(textWidth(part) / perLine)), 0)
    if (n > lines) lines = n
  })
  return lines
}

// Split the rows across sheets by how tall they print, not how many they are.
// Padding every sheet to a fixed row COUNT is what used to push the totals and
// signatures off the page as soon as a detail wrapped onto three lines.
export function paginateRows(lines: number[], budget = PRINT_ROWS_PER_PAGE): { rows: number[]; lines: number }[] {
  const pages: { rows: number[]; lines: number }[] = []
  let page: number[] = []
  let used = 0
  lines.forEach((n, i) => {
    // A row taller than a whole sheet still has to go somewhere: it gets its own.
    if (page.length && used + n > budget) { pages.push({ rows: page, lines: used }); page = []; used = 0 }
    page.push(i)
    used += n
  })
  if (page.length) pages.push({ rows: page, lines: used })
  if (!pages.length) pages.push({ rows: [], lines: 0 })
  return pages
}

// ----- Printed column widths -----
// A width is a real measurement in millimetres on the sheet. The table lives
// inside an A4 page (210mm) less its 10mm margins on each side.
export const PRINT_TABLE_MM = 190
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

// The fill-in table shows the columns in the proportions the sheet will print
// them in — as percentages, so the table fills whatever width the screen gives
// it. Millimetres cannot be used directly here: a form whose widths add up to
// more than a page would otherwise draw a table several screens wide.
export function fillColumnPercents(seqMm: number, cols: FormColumn[]): string[] {
  const { cols: mm } = printWidthsMm(seqMm, cols.map(c => c.width))
  const total = mm.reduce((sum, w) => sum + w, 0) || 1
  return mm.map(w => `${((w / total) * 100).toFixed(3)}%`)
}
// Width below which the table scrolls instead of squeezing its columns out of
// use. Only the readable minimum counts — a wide setting belongs on paper, not
// in a table someone has to type into.
export function tableMinWidth(cols: FormColumn[]): number {
  return SEQ_COL_PX + ACTION_COL_PX
    + cols.reduce((sum, c) => sum + (c.type === 'date' ? DATE_COL_MIN_PX : COL_MIN_PX), 0)
}
