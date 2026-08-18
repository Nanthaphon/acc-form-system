import { describe, it, expect } from 'vitest'
import { computeRow, computeColumnTotals, grandTotal, bahtTextForRows, round2, taxSummary } from './calc'
import { EXPENSE_CLAIM_DEFAULT_COLUMNS, emptyRow } from '../../types/schema'

const cols = EXPENSE_CLAIM_DEFAULT_COLUMNS

describe('computeRow', () => {
  it('คำนวณคอลัมน์ calc ตามลำดับ (27 × 500 → 13500 / 405 / 13095)', () => {
    const r = computeRow(cols, { ...emptyRow(cols), workDays: 27, ratePerDay: 500 })
    expect(r.amountBeforeWht).toBe(13500)
    expect(r.wht3).toBe(405)
    expect(r.amountNet).toBe(13095)
  })
})

describe('computeColumnTotals', () => {
  it('รวมแต่ละคอลัมน์ตัวเลข/คำนวณสำหรับ 2 รายการ', () => {
    const rows = [
      { ...emptyRow(cols), workDays: 27, ratePerDay: 500 },
      { ...emptyRow(cols), workDays: 25, ratePerDay: 500 },
    ]
    const t = computeColumnTotals(cols, rows)
    expect(t.amountBeforeWht).toBe(26000)
    expect(t.wht3).toBe(780)
    expect(t.amountNet).toBe(25220)
  })
})

describe('grandTotal + bahtTextForRows', () => {
  it('ยอดรวมจากคอลัมน์ isTotal + ตัวอักษรไทย', () => {
    const rows = [
      { ...emptyRow(cols), workDays: 27, ratePerDay: 500 },
      { ...emptyRow(cols), workDays: 25, ratePerDay: 500 },
    ]
    expect(grandTotal(cols, rows)).toBe(25220)
    expect(bahtTextForRows(cols, rows)).toBe('สองหมื่นห้าพันสองร้อยยี่สิบบาทถ้วน')
  })
})

describe('round2', () => {
  it('ปัด 2 ตำแหน่ง', () => expect(round2(405.005)).toBe(405.01))
})

describe('taxSummary', () => {
  it('VAT 7% + หัก ณ ที่จ่าย 3% จากยอดก่อนภาษี', () => {
    expect(taxSummary(10000, true, 3)).toEqual({ subtotal: 10000, vatAmount: 700, whtAmount: 300, netTotal: 10400 })
  })
  it('หัก ณ ที่จ่าย 5% อย่างเดียว', () => {
    expect(taxSummary(10000, false, 5)).toEqual({ subtotal: 10000, vatAmount: 0, whtAmount: 500, netTotal: 9500 })
  })
  it('ไม่ติ๊กอะไร = ยอดสุทธิเท่ายอดรวม', () => {
    expect(taxSummary(10000)).toEqual({ subtotal: 10000, vatAmount: 0, whtAmount: 0, netTotal: 10000 })
  })
})
