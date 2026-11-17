import { describe, it, expect } from 'vitest'
import { buildDocumentXlsx, documentSheet, excelFileName } from './excelExport'
import type { ExcelDocument } from './excelExport'
import { readPart, readSheet } from '../../shared/xlsx'
import { excelDate } from '../../shared/xlsxWrite'
import type { Cell } from '../../shared/xlsxWrite'
import type { ExpenseHeader, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// A form shaped like the one in the request: a date column, codes and account
// numbers, and money columns that are summed.
const cols: FormColumn[] = [
  { key: 'reqDate', label: 'วัน/เดือน/ปีที่ต้องการเบิก', type: 'date' },
  { key: 'pcCode', label: 'PC Code', type: 'text' },
  { key: 'pcName', label: 'PC Name', type: 'text' },
  { key: 'bank', label: 'ธนาคาร', type: 'select', options: ['SCB', 'KBANK'] },
  { key: 'account', label: 'เลขบัญชี', type: 'text' },
  { key: 'secret', label: 'ซ่อน', type: 'text', hidden: true },
  { key: 'days', label: 'วันทำงาน', type: 'number' },
  { key: 'unit', label: 'มูลค่าต่อหน่วย', type: 'number' },
  { key: 'gross', label: 'จำนวนเงินรวม', type: 'calc', calc: { op: 'multiply', a: 'days', b: 'unit' } },
  { key: 'net', label: 'จำนวนเงินสุทธิ', type: 'calc', calc: { op: 'subtract', a: 'gross', b: 'days' }, isTotal: true },
]
const settings: FormSettings = {
  ...EXPENSE_CLAIM_DEFAULTS, columns: cols, formCode: 'GAC69-005',
  categories: ['ค่าไมล์เลจและค่าใช้จ่ายเดินทาง', 'ค่าเบี้ยเลี้ยง'], notes: ['แนบใบเสร็จทุกรายการ'],
}
const header: ExpenseHeader = {
  subject: '', categories: ['ค่าไมล์เลจและค่าใช้จ่ายเดินทาง'], companyId: 'globe',
  firstName: 'พัชรพร', lastName: 'เงินพลับพลา', position: 'PC Management Specialist', job: 'Haier',
}
const doc: ExcelDocument = {
  company: null, header, settings, docNumber: 'GAC69-005-202611-0019',
  createdAt: new Date(2026, 10, 16, 9, 30).getTime(),
  items: [
    { reqDate: '2026-11-18', pcCode: 'HATPC26050364', pcName: 'นายสุรชัย จอมแปง', bank: 'SCB', account: '0062446613', unit: 2420.5 },
    { reqDate: '2026-02-03', pcCode: '00123', pcName: 'นางสาวสุพรรษา แพทอง', bank: 'SCB', account: '8462386676123456', days: 2, unit: 130.25 },
    { reqDate: '', pcCode: '', pcName: 'แถวว่าง', bank: '', account: '' },
  ],
}

const sheet = documentSheet(doc)
const asCell = (c: Cell | string | null | undefined): Cell | undefined =>
  c === null || c === undefined ? undefined : typeof c === 'string' ? { v: c } : c
const headRow = sheet.rows.findIndex(r => asCell(r[1])?.v === 'วัน/เดือน/ปีที่ต้องการเบิก')
const cellAt = (r: number, c: number) => asCell(sheet.rows[r][c])

describe('a document as an Excel sheet', () => {
  it('has the form\'s own visible columns, in its order, after ลำดับ', () => {
    expect(sheet.rows[headRow].map(c => asCell(c)?.v)).toEqual([
      'ลำดับ', 'วัน/เดือน/ปีที่ต้องการเบิก', 'PC Code', 'PC Name', 'ธนาคาร', 'เลขบัญชี',
      'วันทำงาน', 'มูลค่าต่อหน่วย', 'จำนวนเงินรวม', 'จำนวนเงินสุทธิ',
    ])
  })

  it('keeps codes and account numbers as text, leading zeros and all', () => {
    expect(cellAt(headRow + 1, 2)).toEqual({ v: 'HATPC26050364', s: 'cell' })
    expect(cellAt(headRow + 1, 5)).toEqual({ v: '0062446613', s: 'cell' })
    expect(cellAt(headRow + 2, 2)).toEqual({ v: '00123', s: 'cell' })
    expect(cellAt(headRow + 2, 5)).toEqual({ v: '8462386676123456', s: 'cell' })
  })

  it('writes dates as real dates, day and month never swapped', () => {
    expect(cellAt(headRow + 1, 1)).toEqual({ v: excelDate('2026-11-18'), s: 'cellDate' })
    expect(cellAt(headRow + 2, 1)).toEqual({ v: excelDate('2026-02-03'), s: 'cellDate' })
    expect(excelDate('2026-02-03')).toBe(46056)   // 3 Feb 2026, as Excel counts it
    expect(excelDate('2026-11-18')).toBe(46344)
    expect(excelDate('2026-02-31')).toBeNull()
    // the day the document was made, beside its label
    const made = sheet.rows.find(r => r[0] === 'วันที่')!
    expect(asCell(made[1])).toEqual({ v: excelDate('2026-11-16'), s: 'date' })
  })

  it('writes amounts as numbers, and leaves an empty row empty', () => {
    expect(cellAt(headRow + 1, 7)).toEqual({ v: 2420.5, s: 'cellMoney' })
    expect(cellAt(headRow + 1, 6)).toEqual({ v: '', s: 'cellMoney' })   // วันทำงาน not filled
    expect(cellAt(headRow + 2, 8)).toEqual({ v: 260.5, s: 'cellMoney' })
    expect(cellAt(headRow + 3, 8)).toEqual({ v: '', s: 'cellMoney' })
  })

  it('sums each money column with a formula that carries the document\'s total', () => {
    const total = sheet.rows[headRow + 4]
    expect(asCell(total[0])?.v).toBe('รวมทั้งสิ้น')
    const first = headRow + 2, last = headRow + 4      // 1-based Excel rows of the three items
    expect(asCell(total[8])).toEqual({ v: 2681, f: `SUM(I${first}:I${last})`, s: 'totalMoney' })
    expect(asCell(total[9])).toEqual({ v: 2679, f: `SUM(J${first}:J${last})`, s: 'totalMoney' })
  })

  it('carries the heading, ticks, requester, amount in words and notes', () => {
    const flat = sheet.rows.flat().map(c => asCell(c)?.v)
    expect(flat).toContain('GAC69-005-202611-0019')
    expect(flat).toContain('GAC69-005')
    expect(flat).toContain('☑ ค่าไมล์เลจและค่าใช้จ่ายเดินทาง')
    expect(flat).toContain('☐ ค่าเบี้ยเลี้ยง')
    expect(flat).toContain('เงินพลับพลา')
    expect(flat).toContain('เป็นจำนวนเงิน  สองพันหกร้อยเจ็ดสิบเก้าบาทถ้วน')
    expect(flat).toContain('แนบใบเสร็จทุกรายการ')
    expect(flat).not.toContain('ซ่อน')
  })

  it('lists the tax summary with deductions as negative figures that add up to the net', () => {
    const taxed = documentSheet({ ...doc, header: { ...header, vat: true, whtRate: 3 } })
    const figures = taxed.rows
      .map(r => r.map(asCell))
      .filter(r => r.some(c => c?.s === 'money' || c?.s === 'moneyBold'))
      .map(r => [r[r.length - 2]?.v, r[r.length - 1]?.v])
    expect(figures).toEqual([
      ['ยอดรวม (ก่อนภาษี)', 2679],
      ['ภาษีมูลค่าเพิ่ม 7%', 187.53],
      ['หัก ณ ที่จ่าย 3%', -80.37],
      ['ยอดสุทธิ', 2786.16],
    ])
  })

  it('names the file after the document', () => {
    expect(excelFileName('GAC69-005-202611-0019')).toBe('GAC69-005-202611-0019.xlsx')
    expect(excelFileName('A/B')).toBe('A-B.xlsx')
  })
})

describe('the .xlsx file', () => {
  const bytes = async () => {
    const b = await buildDocumentXlsx(doc)
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
  }

  it('stores text as text, numbers as numbers and Thai as Thai', async () => {
    const xml = await readPart(await bytes(), 'xl/worksheets/sheet1.xml')
    // an account number is an inline string, never a bare <v>
    expect(xml).toMatch(/t="inlineStr"><is><t xml:space="preserve">0062446613<\/t>/)
    expect(xml).not.toMatch(/<v>62446613<\/v>/)
    // money is a number with no type attribute
    expect(xml).toMatch(/<c r="H\d+" s="8"><v>2420.5<\/v><\/c>/)
    expect(xml).toContain('<f>SUM(')
    expect(xml).toContain('พัชรพร')
    const styles = await readPart(await bytes(), 'xl/styles.xml')
    expect(styles).toContain('formatCode="dd/mm/yyyy"')
  })

  it('reads back the same grid', async () => {
    const grid = await readSheet(await bytes())
    expect(grid[headRow + 1].slice(0, 6)).toEqual(['1', '46344', 'HATPC26050364', 'นายสุรชัย จอมแปง', 'SCB', '0062446613'])
  })
})

describe('blank space picked up on the way in', () => {
  // As pasted from a bank list: trailing spaces, a non-breaking space, a zero-width mark.
  const padded: ExcelDocument = {
    ...doc,
    header: { ...header, firstName: '  กนกวรรณ ', lastName: 'พิลานนท์\u00A0', position: 'PcMs Specialist   ', job: '\tHaier ' },
    items: [
      { reqDate: ' 2026-11-17 ', pcCode: 'pc1305161   ', pcName: ' นายพักดี สีฉะสม  ', bank: 'KBANK ', account: '0582832579          ', days: 10, unit: 150 },
      { reqDate: '2026-11-17', pcCode: '\u200Bpc1504071', pcName: 'นายกำจร การขาย', bank: 'KBANK', account: '5832234798\u00A0\u00A0', days: 10, unit: 150 },
    ],
  }
  const s = documentSheet(padded)
  const at = (r: number, c: number) => asCell(s.rows[r][c])

  it('cuts every text cell clean, leading zeros kept as text', () => {
    expect(at(headRow + 1, 5)).toEqual({ v: '0582832579', s: 'cell' })
    expect(at(headRow + 2, 5)).toEqual({ v: '5832234798', s: 'cell' })
    expect(at(headRow + 1, 2)).toEqual({ v: 'pc1305161', s: 'cell' })
    expect(at(headRow + 2, 2)).toEqual({ v: 'pc1504071', s: 'cell' })
    expect(at(headRow + 1, 3)).toEqual({ v: 'นายพักดี สีฉะสม', s: 'cell' })
    expect(at(headRow + 1, 4)?.v).toBe('KBANK')
    expect(at(headRow + 1, 1)).toEqual({ v: excelDate('2026-11-17'), s: 'cellDate' })
    const texts = s.rows.flat().map(c => asCell(c)?.v).filter((v): v is string => typeof v === 'string' && v !== '')
    for (const t of texts) expect(t).toBe(t.replace(/^[\s\u200B\uFEFF]+|[\s\u200B\uFEFF]+$/g, ''))
    expect(texts).toEqual(expect.arrayContaining(['กนกวรรณ', 'พิลานนท์', 'PcMs Specialist', 'Haier']))
  })

  it('keeps the account column wide enough that no number breaks across lines', () => {
    const narrow = documentSheet({ ...padded, settings: { ...settings, columns: cols.map(c => c.key === 'account' ? { ...c, width: 1 } : c) } })
    expect(narrow.cols![5].width).toBeGreaterThanOrEqual('0582832579'.length + 2)
  })

  it('writes no padding into the file', async () => {
    const b = await buildDocumentXlsx(padded)
    const xml = await readPart(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, 'xl/worksheets/sheet1.xml')
    expect(xml).toContain('<t xml:space="preserve">0582832579</t>')
    expect(xml).toContain('<t xml:space="preserve">5832234798</t>')
    expect(xml).not.toMatch(/<t xml:space="preserve">[^<]*[\s\u00A0\u200B]<\/t>/)
    expect(xml).not.toMatch(/<t xml:space="preserve">[\s\u00A0\u200B]/)
  })
})
