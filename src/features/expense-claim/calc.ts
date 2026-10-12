import type { FormColumn, ExpenseRow, TaxScope } from '../../types/schema'
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

// ----- What each tax is charged on -----
// A document charges VAT (and withholding) either on everything, which is the
// usual way, or on chosen lines only — a supplier's work is withheld while a
// hotel bill is not. Each tax is decided on its own, per document: one can be
// charged on everything while the other is picked line by line.
// Picked lines carry a tick under these reserved keys, which no column can use:
// a column key is generated as col1, col2, … and never holds a colon.
export const ROW_VAT_KEY = 'tax:vat'
export const ROW_WHT_KEY = 'tax:wht'
export function isRowTicked(row: ExpenseRow, key: string): boolean {
  return row[key] === 1 || row[key] === '1'
}
export const TICK = 1
export const UNTICK = ''

// What VAT and withholding are each worked out on, given how this document
// charges them. 'all' is the whole subtotal; 'rows' is the ticked lines.
export function taxBases(
  columns: FormColumn[], rows: ExpenseRow[], scopes: { vat?: TaxScope; wht?: TaxScope },
): { vat: number; wht: number } {
  const everything = grandTotal(columns, rows)
  const totalCol = totalColumn(columns)
  const ticked = (key: string) => !totalCol ? 0 : round2(rows
    .filter(r => isRowTicked(r, key))
    .reduce((s, r) => s + (Number(computeRow(columns, r)[totalCol.key]) || 0), 0))
  return {
    vat: scopes.vat === 'rows' ? ticked(ROW_VAT_KEY) : everything,
    wht: scopes.wht === 'rows' ? ticked(ROW_WHT_KEY) : everything,
  }
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
// How many rows a sheet holds is not a fixed number: it is whatever is left of
// the page once the rest of the form has taken its share. Every millimetre
// below was measured off a printed sheet (A4, print stylesheet applied).
// A4 less the 10mm print margin top and bottom.
export const PRINT_SHEET_MM = 276
// One line of a table row. Each figure below includes the gap above its block,
// which is most of what the form spends: two signature rows alone take 62mm.
const TABLE_LINE_MM = 5.3        // one wrapped line inside a row
const ROW_BASE_MM = 1.3          // …plus this much for the row itself
const HEADER_BAND_MM = 18.5      // logo, company, document title, rule, form code
const CATEGORY_BLOCK_MM = 2.1    // the category checkboxes…
const CATEGORY_ROW_MM = 4.75     // …two to a row
const REQUESTER_MM = 7.7         // ชื่อ / นามสกุล / ตำแหน่ง / Job
const HEADER_FIELD_MM = 6.6      // each extra field above the table
const PARAGRAPH_BLOCK_MM = 3.5   // a form paragraph…
const TEXT_LINE_MM = 4.8         // …and each of its lines
const THEAD_PADDING_MM = 5.2     // the gap above the table, plus the heading's own padding
const TOTALS_ROW_MM = 6.6
const TAX_BLOCK_MM = 2.1         // the VAT / withholding box…
const TAX_LINE_MM = 4.3          // …and each line in it
const BAHT_BOX_MM = 10.1         // เป็นจำนวนเงิน … บาทถ้วน
const SIGNATURE_ROW_MM = 30.9    // one row of up to three signature blocks
const NOTES_BLOCK_MM = 6.35      // หมายเหตุ…
const NOTE_LINE_MM = 4.24        // …and each line of it
// Printing is unforgiving: a sheet 1mm too full spills onto another page, so
// the estimate keeps a little in hand.
const SAFETY_MM = 2

// What the sheet spends on everything except the table's own rows — the
// heading and the totals row included, since neither is a row anyone fills in.
export interface SheetParts {
  categoryRows?: number
  showRequester?: boolean
  headerFields?: number
  introLines?: number
  bodyLines?: number
  headLines?: number       // the tallest column heading, in lines
  taxLines?: number        // lines in the tax box; 0 when there is no box
  showAmountWords?: boolean
  signatureRows?: number
  noteLines?: number       // the notes, including their heading
}
export function sheetOverheadMm(p: SheetParts): number {
  const paragraphs = (p.introLines ?? 0) + (p.bodyLines ?? 0)
  return HEADER_BAND_MM
    + (p.categoryRows ? CATEGORY_BLOCK_MM + p.categoryRows * CATEGORY_ROW_MM : 0)
    + (p.showRequester ? REQUESTER_MM : 0)
    + (p.headerFields ?? 0) * HEADER_FIELD_MM
    + (p.introLines ? PARAGRAPH_BLOCK_MM : 0) + (p.bodyLines ? PARAGRAPH_BLOCK_MM : 0)
    + paragraphs * TEXT_LINE_MM
    + (p.headLines ?? 1) * TABLE_LINE_MM + THEAD_PADDING_MM
    + TOTALS_ROW_MM
    + (p.taxLines ? TAX_BLOCK_MM + p.taxLines * TAX_LINE_MM : 0)
    + (p.showAmountWords ? BAHT_BOX_MM : 0)
    + (p.signatureRows ?? 0) * SIGNATURE_ROW_MM
    + (p.noteLines ? NOTES_BLOCK_MM + p.noteLines * NOTE_LINE_MM : 0)
    + SAFETY_MM
}

// How many millimetres of table rows a sheet of this form can hold. Never less
// than one row, so a form with a great deal around the table still prints one.
export function printBodyMm(p: SheetParts): number {
  return Math.max(rowHeightMm(1), PRINT_SHEET_MM - sheetOverheadMm(p))
}

// What a row costs on paper. Every row pays once for its own padding and then
// per line of wrapped text; a row left blank is shorter than one with text in
// it, which is why a sheet cannot simply be budgeted in lines.
export function rowHeightMm(lines: number): number {
  return ROW_BASE_MM + Math.max(1, lines) * TABLE_LINE_MM
}

// At the printed 10px size a Thai letter takes about 2.1mm, and each cell keeps
// ~2mm of padding. Latin letters, digits and punctuation are narrower, so they
// count for a fraction of one — and Thai vowels and tone marks sit above or
// below the letter they belong to, taking no width at all. Counting those as
// letters is what used to make the estimate run a line over on every row.
const THAI_CHAR_MM = 2.1
const NARROW_CHAR_RATIO = 0.55
const CELL_PADDING_MM = 2.2
// The marks that print above or below: ั, ิ–ฺ, ็–๎
const ZERO_WIDTH_THAI = /[ัิ-ฺ็-๎]/

// Roughly how many Thai-letter widths a piece of text takes up.
function textWidth(text: string): number {
  let w = 0
  for (const ch of text) {
    if (ZERO_WIDTH_THAI.test(ch)) continue
    w += ch.charCodeAt(0) < 0x0e00 ? NARROW_CHAR_RATIO : 1
  }
  return w
}

// How many printed lines a row needs: its tallest cell decides.
export function rowLines(widthsMm: number[], texts: string[]): number {
  const charMm = THAI_CHAR_MM
  let lines = 1
  texts.forEach((text, i) => {
    if (!text) return
    const usable = Math.max((widthsMm[i] ?? 0) - CELL_PADDING_MM, charMm)
    const perLine = Math.max(1, usable / charMm)
    const n = text.split('\n').reduce((sum, part) => sum + Math.max(1, Math.ceil(textWidth(part) / perLine)), 0)
    if (n > lines) lines = n
  })
  return lines
}

// Split the rows across sheets by how tall they print, not how many they are.
// Padding every sheet to a fixed row COUNT is what used to push the totals and
// signatures off the page as soon as a detail wrapped onto three lines.
export function paginateRows(heightsMm: number[], availableMm: number): { rows: number[]; usedMm: number }[] {
  const pages: { rows: number[]; usedMm: number }[] = []
  let page: number[] = []
  let used = 0
  heightsMm.forEach((mm, i) => {
    // A row taller than a whole sheet still has to go somewhere: it gets its own.
    if (page.length && used + mm > availableMm) { pages.push({ rows: page, usedMm: used }); page = []; used = 0 }
    page.push(i)
    used += mm
  })
  if (page.length) pages.push({ rows: page, usedMm: used })
  if (!pages.length) pages.push({ rows: [], usedMm: 0 })
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
// `scale` is the size of the text in the boxes (1 = ปกติ): larger text needs
// more room before it is cut off — a date in particular, which must show
// dd/mm/yyyy whole. The number and the bin button are icons and stay as they are.
export function tableMinWidth(cols: FormColumn[], scale = 1): number {
  return SEQ_COL_PX + ACTION_COL_PX
    + cols.reduce((sum, c) => sum + (c.type === 'date' ? DATE_COL_MIN_PX : COL_MIN_PX) * scale, 0)
}
