// A document as an Excel workbook — the same sheet the preview prints, laid out
// for working with rather than for paper.
//
// "ไม่เพี้ยน" is the whole point, so every cell is written as what it is:
// - text columns (PC Code, account numbers, names) are text, never numbers —
//   a leading 0 stays and a long number never turns into 6.36E+09;
// - dates are real dates (a date serial shown dd/mm/yyyy), so no regional
//   setting can swap the day and the month;
// - amounts are real numbers shown with two decimals, and the totals are SUM
//   formulas that carry the document's own figure;
// - the workbook is UTF-8 XML in Tahoma, so Thai reads as Thai;
// - every text is cut clean of the blank space it picked up on the way in
//   (a pasted "0582832579␣␣␣␣" is written as 0582832579), and a column of
//   codes or account numbers is wide enough that none breaks across lines.
// Columns are the form's own visible columns, in its order.

import type { Company, DocSignature, ExpenseHeader, ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS, formSignatureBlocks, isTextCol, seqColumnWidth, showSeqColumn } from '../../types/schema'
import { columnLetter, excelDate, writeXlsx } from '../../shared/xlsxWrite'
import type { Cell, Sheet } from '../../shared/xlsxWrite'
import { bahtText } from '../../shared/bahttext'
import { autoValue, blankFor, formatTemplateValue, parseTemplate } from '../../shared/bodyTemplate'
import type { AutoValues } from '../../shared/bodyTemplate'
import { computeColumnTotals, computeRow, printWidthsMm, rowHasNumbers, visibleColumns, PRINT_TABLE_MM } from './calc'
import { documentSummary } from './summary'
import { cleanText } from '../../shared/cleanText'

export interface ExcelDocument {
  company: Company | null
  header: ExpenseHeader
  items: ExpenseRow[]
  docNumber: string
  settings?: FormSettings
  signatures?: DocSignature[]
  voided?: boolean
  replacedBy?: string | null
  createdAt?: number | null
}

const DEFAULT_COMPANY = 'GLOBE SYNDICATE (THAILAND) CO.,LTD.'
const DEFAULT_ADDRESS =
  '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น 6 ถนนพัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ'

type Row = (Cell | string | null | undefined)[]

const text = cleanText
const filled = (v: unknown): boolean => text(v) !== ''

// Every text cell cut clean — the one pass that covers the heading, the table,
// the paragraphs and the signatures alike.
function cleanCell(c: Cell | string | null | undefined): Cell | string | null | undefined {
  if (typeof c === 'string') return cleanText(c)
  if (c && typeof c.v === 'string' && !c.f) return { ...c, v: cleanText(c.v) }
  return c
}

// The longest run a cell cannot break at — codes, account numbers, e-mail
// addresses (Latin letters, digits, signs) with no space to wrap on. Thai text
// is left out: it wraps on its own and would only stretch the column.
const MAX_UNBROKEN = 30
function unbrokenLength(c: Cell | string | null | undefined): number {
  const v = typeof c === 'string' ? c : c?.v
  if (typeof v !== 'string') return 0
  return Math.max(0, ...v.split(/\s+/).filter(t => /^[\x21-\x7E]+$/.test(t)).map(t => t.length))
}

// A date from the document: a real date when it is one, else the text as typed.
function dateCell(raw: unknown, style: 'cellDate' | 'date', textStyle?: 'cell'): Cell {
  const serial = typeof raw === 'string' ? excelDate(raw) : null
  return serial !== null ? { v: serial, s: style } : { v: text(raw), s: textStyle }
}

// A paragraph with its {{blanks}} filled in, the way the sheet prints it — one
// Excel row per line of it.
function paragraphRows(source: string | undefined, values: Record<string, string> | undefined, auto: AutoValues): Row[] {
  if (!source?.trim()) return []
  const filledText = parseTemplate(source).map(p => {
    if (p.kind === 'text') return p.text
    const v = p.field.type === 'auto' ? autoValue(p.field.source, auto) : formatTemplateValue(p.field, values?.[p.field.key])
    return v || blankFor(p.field)
  }).join('')
  return filledText.split('\n').map(line => [line])
}

/** The document as one worksheet. */
export function documentSheet(doc: ExcelDocument): Sheet {
  const settings = doc.settings ?? EXPENSE_CLAIM_DEFAULTS
  const cols = settings.columns
  const { header, tax, hasTax, lines } = documentSummary(cols, doc.header, doc.items)
  const vcols = visibleColumns(cols)
  const withSeq = showSeqColumn(settings)
  const offset = withSeq ? 1 : 0
  const computed = doc.items.map(r => computeRow(cols, r))
  const totals = computeColumnTotals(cols, doc.items)
  const firstNumericIdx = vcols.findIndex(c => !isTextCol(c.type))
  const hasNumericCols = firstNumericIdx >= 0
  const auto: AutoValues = { company: doc.company?.name, amount: tax.netTotal, requester: `${header.firstName} ${header.lastName}`, position: header.position }

  const rows: Row[] = []
  const add = (...r: Row[]) => { rows.push(...r) }

  // ---- heading
  add([{ v: doc.company?.headerName || DEFAULT_COMPANY, s: 'title' }])
  add([doc.company?.address || DEFAULT_ADDRESS])
  add([{ v: settings.title, s: 'bold' }])
  if (doc.voided) {
    add([{ v: `เอกสารฉบับนี้ถูกยกเลิกแล้ว${doc.replacedBy ? ` — ใช้ฉบับ ${doc.replacedBy} แทน` : ''}`, s: 'bold' }])
  }
  add([])
  add(['เลขที่เอกสาร', doc.docNumber])
  if (doc.createdAt) add(['วันที่', dateCell(isoDay(doc.createdAt), 'date')])
  if (settings.formCode) add(['รหัสฟอร์ม', settings.formCode])
  if (settings.subject) add(['เรื่อง', settings.subject])
  if (settings.attention) add(['เรียน', settings.attention])
  settings.categories.filter(Boolean).forEach((label, i) => {
    add([i === 0 ? 'ประเภท' : '', `${header.categories.includes(label) ? '☑' : '☐'} ${label}`])
  })
  if (settings.showRequester !== false) {
    add(['ชื่อ', header.firstName], ['นามสกุล', header.lastName], ['ตำแหน่ง', header.position], ['Job', header.job])
  }
  for (const f of settings.headerFields ?? []) {
    const raw = header.fields?.[f.id] ?? ''
    add([f.label, f.type === 'date' ? dateCell(raw, 'date') : raw])
  }
  const intro = paragraphRows(settings.introText, header.fields, auto)
  if (intro.length) add([], ...intro)
  add([])

  // ---- the table
  add([
    ...(withSeq ? [{ v: 'ลำดับ', s: 'cellHead' } as Cell] : []),
    ...vcols.map(c => ({ v: c.label, s: 'cellHead' } as Cell)),
  ])
  const firstDataRow = rows.length + 1   // 1-based Excel row number
  computed.forEach((row, i) => {
    add([
      ...(withSeq ? [{ v: i + 1, s: 'cellNum' } as Cell] : []),
      ...vcols.map(col => tableCell(cols, row, col)),
    ])
  })
  const lastDataRow = rows.length

  if (hasNumericCols) {
    const labelSpan = firstNumericIdx + offset
    add([
      // A table that opens on a figure has no room for the label; its sums say enough.
      ...Array.from({ length: labelSpan }, (_, k): Cell => ({ v: k === 0 ? 'รวมทั้งสิ้น' : '', s: 'totalLabel' })),
      ...vcols.slice(firstNumericIdx).map((col, k): Cell => {
        if (isTextCol(col.type)) return { v: '', s: 'cell' }
        const letter = columnLetter(labelSpan + k)
        const total = totals[col.key] ?? 0
        return lastDataRow >= firstDataRow
          ? { v: total, f: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`, s: 'totalMoney' }
          : { v: total, s: 'totalMoney' }
      }),
    ])
  }

  // ---- tax summary, its figures under the table's last column
  if (hasTax) {
    const amountAt = Math.max(1, offset + vcols.length - 1)
    add([])
    for (const l of lines) {
      const r: Row = Array.from({ length: amountAt + 1 }, () => null)
      r[amountAt - 1] = { v: l.label, s: l.bold ? 'labelRightBold' : 'labelRight' }
      r[amountAt] = { v: l.minus ? -l.amount : l.amount, s: l.bold ? 'moneyBold' : 'money' }
      add(r)
    }
  }

  if (hasNumericCols && settings.showAmountWords !== false) {
    add([], [{ v: `เป็นจำนวนเงิน  ${bahtText(tax.netTotal)}`, s: 'bold' }])
  }

  const body = paragraphRows(settings.bodyText, header.fields, auto)
  if (body.length) add([], ...body)

  // ---- signatures: who signed and when (the signatures themselves are images, kept on the PDF)
  const blocks = formSignatureBlocks(settings)
  if (blocks.length) {
    add([])
    for (const b of blocks) {
      const sig = doc.signatures?.find(x => x.blockId === b.id)
      const signed = sig?.status === 'signed'
      add([
        { v: b.label, s: 'bold' },
        signed ? `(${sig?.assignedName ?? ''})` : '',
        signed && sig?.signedAt ? dateCell(isoDay(sig.signedAt), 'date') : '',
      ])
    }
  }

  const notes = (settings.notes ?? []).filter(n => (n ?? '').trim() !== '')
  if (notes.length) add([], [{ v: 'หมายเหตุ:', s: 'bold' }], ...notes.map(n => [n]))

  // Widths follow the printed sheet's proportions; the first column also holds
  // the heading's labels, so it is never narrower than they are.
  const mm = printWidthsMm(withSeq ? seqColumnWidth(settings) : 0, vcols.map(c => c.width), PRINT_TABLE_MM)
  const widths = [...(withSeq ? [mm.seq] : []), ...mm.cols].map(w => Math.max(8, Math.round(w * 0.6)))
  if (widths.length) widths[0] = Math.max(widths[0], 14)
  else widths.push(14)

  const clean = rows.map(r => r.map(cleanCell))
  // A column never narrower than its longest code: "0582832579" split into
  // "058283257 / 9" reads as a different account.
  for (let r = firstDataRow - 1; r < lastDataRow; r++) {
    clean[r].forEach((c, i) => {
      const len = Math.min(MAX_UNBROKEN, unbrokenLength(c))
      if (len && i < widths.length) widths[i] = Math.max(widths[i], len + 2)
    })
  }

  return {
    name: sheetName(doc.docNumber),
    cols: widths.map(width => ({ width })),
    rows: clean,
    fitToWidth: true,
  }
}

// One cell of the table, typed by its column.
function tableCell(cols: FormColumn[], row: ExpenseRow, col: FormColumn): Cell {
  const raw = row[col.key]
  if (col.type === 'date') return filled(raw) ? dateCell(text(raw), 'cellDate', 'cell') : { v: '', s: 'cell' }
  if (isTextCol(col.type)) return { v: text(raw), s: 'cell' }
  // A figure only once the row holds one — an empty row stays empty, as it prints.
  const has = col.type === 'calc' ? rowHasNumbers(cols, row) : filled(raw)
  return has ? { v: Number(raw) || 0, s: 'cellMoney' } : { v: '', s: 'cellMoney' }
}

// A timestamp's local calendar day as "yyyy-mm-dd" — the day the sheet prints.
function isoDay(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Excel refuses sheet names over 31 characters or holding : \ / ? * [ ]
function sheetName(docNumber: string): string {
  const clean = docNumber.replace(/[:\\/?*[\]]/g, '-').trim().slice(0, 31)
  return clean || 'เอกสาร'
}

/** The file name the download is saved under. */
export function excelFileName(docNumber: string): string {
  const clean = docNumber.replace(/[\\/:*?"<>|]/g, '-').trim()
  return `${clean || 'เอกสาร'}.xlsx`
}

/** The document as .xlsx bytes. */
export function buildDocumentXlsx(doc: ExcelDocument): Promise<Uint8Array> {
  return writeXlsx([documentSheet(doc)])
}

export { XLSX_MIME } from '../../shared/xlsxWrite'
