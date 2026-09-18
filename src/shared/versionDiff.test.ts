import { describe, it, expect } from 'vitest'
import { describeChanges } from './versionDiff'
import type { ExpenseHeader, ExpenseRow, ExpenseTotals, FormColumn } from '../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายการ', type: 'text' },
  { key: 'qty', label: 'จำนวน', type: 'number' },
  { key: 'amt', label: 'จำนวนเงิน', type: 'calc', calc: { op: 'multiply', operands: ['qty'] } },
]
const header = (o: Partial<ExpenseHeader> = {}): ExpenseHeader => ({
  subject: 'x', categories: [], companyId: 'globe', firstName: 'A', lastName: 'B', position: 'P', job: 'J', ...o,
})
const totals = (g: number): ExpenseTotals => ({ columnTotals: {}, grandTotal: g, amountInThaiText: '' })
const snap = (h: ExpenseHeader, items: ExpenseRow[], g: number) => ({ header: h, items, totals: totals(g) })

describe('describeChanges', () => {
  it('detects a header field change', () => {
    const a = snap(header({ firstName: 'สมชาย' }), [], 0)
    const b = snap(header({ firstName: 'สมหญิง' }), [], 0)
    expect(describeChanges(a, b, cols)).toContain('ชื่อผู้เบิก: สมชาย → สมหญิง')
  })

  it('detects a cell change and ignores calc columns', () => {
    const a = snap(header(), [{ detail: 'x', qty: 100, amt: 100 }], 100)
    const b = snap(header(), [{ detail: 'x', qty: 150, amt: 150 }], 150)
    const r = describeChanges(a, b, cols)
    expect(r).toContain('รายการที่ 1: จำนวน 100 → 150')
    expect(r).toContain('ยอดสุทธิ 100.00 → 150.00') // amounts always carry satang (formatMoney)
    expect(r.some(s => s.includes('จำนวนเงิน'))).toBe(false) // calc column not reported
  })

  it('detects VAT and withholding-tax changes', () => {
    const a = snap(header({ vat: false, whtRate: 0 }), [{ qty: 1 }], 100)
    const b = snap(header({ vat: true, whtRate: 3 }), [{ qty: 1 }], 100)
    const r = describeChanges(a, b, cols)
    expect(r).toContain('ภาษีมูลค่าเพิ่ม 7%: ปิด → เปิด')
    expect(r).toContain('หัก ณ ที่จ่าย: ปิด → 3%')
  })

  it('detects added and removed rows', () => {
    const a = snap(header(), [{ qty: 1 }], 0)
    const b = snap(header(), [{ qty: 1 }, { qty: 2 }], 0)
    expect(describeChanges(a, b, cols)).toContain('เพิ่มรายการที่ 2')
    expect(describeChanges(b, a, cols)).toContain('ลบรายการที่ 2')
  })

  it('returns empty when nothing changed', () => {
    const a = snap(header(), [{ detail: 'x', qty: 1 }], 5)
    expect(describeChanges(a, a, cols)).toEqual([])
  })
})
