import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { computeRow, grandTotal, taxBases, taxHeader, taxSummary, whtInTable, ROW_WHT_KEY, ROW_WHT_RATE_KEY } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// Requested by the users: the table itself shows each line's ภาษีหัก ณ ที่จ่าย
// (จำนวนเงินรวม × the rate picked on the line) and its จำนวนเงินสุทธิ
// (จำนวนเงินรวม − that), instead of typing the withholding in by hand.
const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'gross', label: 'จำนวนเงินรวม', type: 'number' },
  { key: 'wht', label: 'ภาษีหัก ณ ที่จ่าย', type: 'calc', calc: { op: 'whtRow', a: 'gross' } },
  { key: 'net', label: 'จำนวนเงินสุทธิ', type: 'calc', calc: { op: 'subtract', operands: ['gross', 'wht'] }, isTotal: true },
]
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols }
const header: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: '', job: '' }
const row = (detail: string, gross: number, rate?: number): ExpenseRow => ({ detail, gross, ...(rate ? { [ROW_WHT_RATE_KEY]: rate } : {}) })
const items = [row('ค่าขนส่ง', 2000, 1), row('ค่าบริการ', 5000, 3), row('ค่าโรงแรม', 1500)]

describe('withholding worked out in the table', () => {
  it('takes each line\'s amount at the rate picked on that line, and nets it off', () => {
    expect(computeRow(cols, items[0])).toMatchObject({ wht: 20, net: 1980 })
    expect(computeRow(cols, items[1])).toMatchObject({ wht: 150, net: 4850 })
    expect(computeRow(cols, items[2])).toMatchObject({ wht: 0, net: 1500 })     // ไม่หัก
  })

  it('reads a line ticked before lines had rates as not withheld here', () => {
    expect(computeRow(cols, { detail: 'x', gross: 1000, [ROW_WHT_KEY]: 1 })).toMatchObject({ wht: 0, net: 1000 })
  })

  // The net column is the document's total already: the withholding switched
  // on below the table would take it off a second time.
  it('is not taken off again by the document\'s withholding', () => {
    const withWht = { ...header, whtRate: 3, whtScope: 'rows' as const }
    expect(whtInTable(cols)).toBe(true)
    const total = grandTotal(cols, items)
    expect(total).toBe(8330)                       // 1,980 + 4,850 + 1,500
    const tax = taxSummary(total, false, taxHeader(cols, withWht).whtRate, 0, taxBases(cols, items, { wht: 'rows' }))
    expect(tax.whtAmount).toBe(0)
    expect(tax.netTotal).toBe(8330)
  })

  it('leaves forms without such a column as they were', () => {
    const plain = cols.filter(c => c.key !== 'wht')
    expect(whtInTable(plain)).toBe(false)
    expect(taxHeader(plain, { ...header, whtRate: 3 }).whtRate).toBe(3)
  })

  it('asks each line for its rate without switching withholding on, and shows what it comes to', () => {
    const onItemsChange = vi.fn()
    const { container, unmount } = render(<ExpenseClaimForm header={header} items={[row('ค่าบริการ', 5000)]} columns={cols} onHeaderChange={vi.fn()} onItemsChange={onItemsChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 1' }), { target: { value: '3' } })
    expect(onItemsChange).toHaveBeenCalledWith([expect.objectContaining({ [ROW_WHT_RATE_KEY]: 3 })])
    // and no second withholding switch under the table
    const whtTaxRow = (c: HTMLElement) => [...c.querySelectorAll('[data-tax-row]')].some(r => r.textContent?.includes('หัก ณ ที่จ่าย'))
    expect(whtTaxRow(container)).toBe(false)
    unmount()
    const plain = render(<ExpenseClaimForm header={header} items={[row('ค่าบริการ', 5000)]} columns={cols.filter(c => c.key !== 'wht')} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    expect(whtTaxRow(plain.container)).toBe(true)
  })

  it('prints the lines with their withholding, and no withholding line under the table', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={{ ...header, whtRate: 3, whtScope: 'rows' }} items={items} docNumber="X" settings={settings} />)
    const sheet = container.querySelector('.doc-page')!
    expect(sheet.textContent).toContain('150.00')
    expect(sheet.textContent).toContain('4,850.00')
    expect(sheet.textContent).toContain('8,330.00')
    expect(sheet.textContent).not.toMatch(/หัก ณ ที่จ่าย \d+%/)
  })
})
