import { describe, it, expect } from 'vitest'
import type { FormColumn, ExpenseRow, SignatureBlock } from '../../types/schema'
import { SEQ_COLUMN_WIDTH, seqColumnWidth } from '../../types/schema'
import { readFileSync } from 'node:fs'
import { computeRow, computeColumnTotals, grandTotal, taxSummary, bahtTextForRows } from './calc'

// Read straight out of the migration, so this checks the layout that actually
// ships rather than a copy of it that can drift.
const SQL = readFileSync('supabase/2026-09-18-form-gac69-005.sql', 'utf8')
// Pulled out by hand rather than by regex: the JSON holds escapes of its own,
// and a pattern over it is easy to get subtly wrong.
const jsonbOf = (field: string): unknown => {
  const at = SQL.indexOf(field + " = '[")
  if (at < 0) throw new Error('not found in the migration: ' + field)
  const from = SQL.indexOf('[', at)
  const to = SQL.indexOf("]'::jsonb", from)
  if (to < 0) throw new Error('unterminated jsonb literal for: ' + field)
  return JSON.parse(SQL.slice(from, to + 1))
}
const COLUMNS = jsonbOf('columns') as FormColumn[]

const row = (over: Partial<ExpenseRow> = {}): ExpenseRow => ({
  docDate: '', detail: '', hotel: 0, supplier: 0, fuel: 0, phone: 0, flight: 0,
  otherDetail: '', other: 0, rowTotal: 0, ...over,
})

describe('form GAC69-005 layout', () => {
  it('adds every money column of a row into จำนวนรวม', () => {
    const r = computeRow(COLUMNS, row({ hotel: 1200, supplier: 58500, fuel: 300, phone: 50, flight: 4000, other: 25 }))
    expect(r.rowTotal).toBe(64075)
  })

  it('leaves the two text columns out of the arithmetic', () => {
    const r = computeRow(COLUMNS, row({ detail: 'งานผนังสแตนเลส', otherDetail: 'ค่าทางด่วน', supplier: 58500 }))
    expect(r.rowTotal).toBe(58500)
  })

  it('totals each money column down the page, and skips the text ones', () => {
    const items = [row({ supplier: 58500 }), row({ fuel: 300, other: 25 })]
    const totals = computeColumnTotals(COLUMNS, items)
    expect(totals.supplier).toBe(58500)
    expect(totals.fuel).toBe(300)
    expect(totals.rowTotal).toBe(58825)
    expect(totals.detail).toBeUndefined()
    expect(totals.otherDetail).toBeUndefined()
  })

  it('takes จำนวนรวม as the amount the taxes are worked out on', () => {
    expect(grandTotal(COLUMNS, [row({ supplier: 58500 })])).toBe(58500)
  })

  it('reproduces the printed document end to end', () => {
    // The scan: 58,500.00 + VAT 7% − 3% − 5% ค่าประกันงาน = 57,915.00
    const items = [row({ detail: 'บจก.อาร์ แอนด์ อาร์ อินดัสตรี้', supplier: 58500 })]
    const subtotal = grandTotal(COLUMNS, items)
    const tax = taxSummary(subtotal, true, 3, 5)
    expect(subtotal).toBe(58500)
    expect(tax.vatAmount).toBe(4095)
    expect(tax.whtAmount).toBe(1755)
    expect(tax.retentionAmount).toBe(2925)
    expect(tax.netTotal).toBe(57915)
  })

  it('writes the total out in words, as the box under the table does', () => {
    expect(bahtTextForRows(COLUMNS, [row({ supplier: 58500 })])).toContain('บาทถ้วน')
  })
})

describe('form GAC69-005 migration', () => {
  it('lays the table out with the columns the paper form has', () => {
    expect(COLUMNS.map(c => c.key)).toEqual([
      'docDate', 'detail', 'hotel', 'supplier', 'fuel', 'phone', 'flight', 'otherDetail', 'other', 'rowTotal',
    ])
  })

  it('stacks the headers the paper stacks, rather than leaving the break to chance', () => {
    // Without an explicit break the browser picks one: it splits Thai at real
    // word boundaries, but "รายละเอียด" arriving as "ราย / ละเอียด" reads as a
    // mistake and does not match the printed form.
    const NL = String.fromCharCode(10)
    const stacked = COLUMNS.filter(c => c.label.includes(NL)).map(c => c.key)
    expect(stacked).toEqual(['supplier', 'fuel', 'phone', 'flight', 'otherDetail', 'other'])
    expect(COLUMNS.find(c => c.key === 'fuel')!.label.split(NL))
      .toEqual(['ค่าน้ำมัน', 'ใบเสร็จ', 'Fleet Card'])
  })

  it('gives every column a width, so nothing is left to wrap on its own', () => {
    expect(COLUMNS.every(c => typeof c.width === 'number' && c.width > 0)).toBe(true)
  })

  it('carries the five signature lines of the paper form', () => {
    expect((jsonbOf('"signatureBlocks"') as SignatureBlock[]).map(b => b.label))
      .toEqual(['ผู้เบิก', 'หัวหน้าแผนก', 'ผู้อนุมัติ', 'ผู้รับเงิน', 'ผู้ตรวจสอบ/ฝ่ายบัญชี'])
  })

  it('keeps the four categories and the four notes', () => {
    expect((jsonbOf('categories') as string[]).length).toBe(4)
    expect((jsonbOf('notes') as string[]).length).toBe(4)
  })
})

describe('seqColumnWidth', () => {
  it('falls back to the built-in width when a form never set one', () => {
    expect(seqColumnWidth(null)).toBe(SEQ_COLUMN_WIDTH)
    expect(seqColumnWidth({})).toBe(SEQ_COLUMN_WIDTH)
  })
  it('uses the form’s own width', () => {
    expect(seqColumnWidth({ seqWidth: 48 })).toBe(48)
  })
  it('ignores a width that would collapse the column', () => {
    expect(seqColumnWidth({ seqWidth: 0 })).toBe(SEQ_COLUMN_WIDTH)
    expect(seqColumnWidth({ seqWidth: -5 })).toBe(SEQ_COLUMN_WIDTH)
  })
  it('the migration widens it, because the default is too narrow for the word "ลำดับ"', () => {
    const set = Number(/"seqWidth" = (\d+)/.exec(SQL)![1])
    expect(set).toBeGreaterThan(SEQ_COLUMN_WIDTH)
  })
})
