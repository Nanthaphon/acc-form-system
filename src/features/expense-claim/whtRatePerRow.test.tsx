import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { taxBases, taxSummary, whtLines, ROW_WHT_KEY, ROW_WHT_RATE_KEY } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// One document, several kinds of payment: Thai withholding is charged at the
// rate for each kind (transport 1%, advertising 2%, services 3%, rent 5%), and
// the 50 ทวิ certificate is issued per kind — so the rate belongs to the line.

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols }
const base: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: '', job: '' }
const row = (detail: string, amount: number, extra: Partial<ExpenseRow> = {}): ExpenseRow => ({ detail, amount, ...extra })

const items: ExpenseRow[] = [
  row('ค่าขนส่ง', 2000, { [ROW_WHT_RATE_KEY]: 1 }),
  row('ค่าบริการติดตั้ง', 5000, { [ROW_WHT_RATE_KEY]: 3 }),
  row('ค่าที่ปรึกษา', 3000, { [ROW_WHT_RATE_KEY]: 3 }),
  row('ค่าโรงแรม', 2000),                          // not withheld
]
const byLine: ExpenseHeader = { ...base, whtRate: 3, whtScope: 'rows' }


describe('withholding at each line\'s own rate', () => {
  it('works each rate out on its own lines, and adds them up', () => {
    const bases = taxBases(cols, items, { wht: 'rows' })
    expect(bases.wht).toBe(10000)                        // every withheld line
    const tax = taxSummary(12000, false, 3, 0, bases)
    expect(tax.whtAmount).toBe(260)                      // 1% of 2,000 + 3% of 8,000
    expect(tax.netTotal).toBe(11740)
  })

  it('reports one line per rate, lowest first, with what each came from', () => {
    const bases = taxBases(cols, items, { wht: 'rows' })
    expect(whtLines(bases, 3)).toEqual([
      { rate: 1, base: 2000, count: 1, amount: 20 },
      { rate: 3, base: 8000, count: 2, amount: 240 },
    ])
  })

  // A line ticked before lines had rates of their own was withheld at the
  // document's rate — and still is, so the total it was saved with holds.
  it('reads an older tick as the document\'s rate', () => {
    const old = [row('a', 8000, { [ROW_WHT_KEY]: 1 }), row('b', 500, { [ROW_WHT_KEY]: 1 })]
    const tax = taxSummary(8500, false, 3, 0, taxBases(cols, old, { wht: 'rows' }))
    expect(tax.whtAmount).toBe(255)
  })

  it('puts an older tick with lines given that same rate', () => {
    const mixed = [row('a', 1000, { [ROW_WHT_KEY]: 1 }), row('b', 1000, { [ROW_WHT_RATE_KEY]: 3 })]
    expect(whtLines(taxBases(cols, mixed, { wht: 'rows' }), 3)).toEqual([
      { rate: 3, base: 2000, count: 2, amount: 60 },
    ])
  })

  // The rate 1% must not be confused with the old tick, which was stored as 1.
  it('keeps 1% apart from the old tick', () => {
    const one = [row('a', 1000, { [ROW_WHT_RATE_KEY]: 1 })]
    expect(taxSummary(1000, false, 5, 0, taxBases(cols, one, { wht: 'rows' })).whtAmount).toBe(10)
  })

  it('withholds nothing when withholding is off, whatever the lines carry', () => {
    expect(taxSummary(12000, false, 0, 0, taxBases(cols, items, { wht: 'rows' })).whtAmount).toBe(0)
  })

  it('leaves a document withheld on everything exactly as before', () => {
    const tax = taxSummary(12000, false, 3, 0, taxBases(cols, items, {}))
    expect(tax.whtAmount).toBe(360)                      // 3% of the whole 12,000
  })
})

describe('on the fill-in screen', () => {
  const show = (header: ExpenseHeader, rows = items) => {
    const onHeaderChange = vi.fn(), onItemsChange = vi.fn()
    render(<ExpenseClaimForm header={header} items={rows} columns={cols} onHeaderChange={onHeaderChange} onItemsChange={onItemsChange} />)
    return { onHeaderChange, onItemsChange }
  }

  it('gives every line a rate to choose', () => {
    show(byLine)
    const pick = screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 2' })
    expect(pick).toHaveValue('3')
    expect([...within(pick).getAllByRole('option')].map(o => o.textContent))
      .toEqual(['ไม่หัก', '1%', '2%', '3%', '5%', 'อื่นๆ'])
    expect(screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 4' })).toHaveValue('0')
  })

  it('records the chosen rate on that line, and clears an older tick with it', () => {
    const { onItemsChange } = show(byLine, [row('a', 1000, { [ROW_WHT_KEY]: 1 })])
    fireEvent.change(screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 1' }), { target: { value: '5' } })
    const saved = onItemsChange.mock.calls[0][0][0]
    expect(saved[ROW_WHT_RATE_KEY]).toBe(5)
    expect(saved[ROW_WHT_KEY]).toBe('')
  })

  it('lets a line take a rate that is not on the list', () => {
    const { onItemsChange } = show(byLine, [row('a', 1000)])
    fireEvent.change(screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 1' }), { target: { value: 'other' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'อัตราหัก ณ ที่จ่าย รายการที่ 1 (%)' }), { target: { value: '1.5' } })
    expect(onItemsChange.mock.calls.at(-1)![0][0][ROW_WHT_RATE_KEY]).toBe(1.5)
  })

  it('hides the document\'s own rate while each line has one', () => {
    show(byLine)
    expect(screen.queryByRole('radio', { name: '3%' })).not.toBeInTheDocument()
  })

  it('sums up one line per rate', () => {
    show(byLine)
    expect(screen.getByText('หัก ณ ที่จ่าย 1% (จาก 2,000.00 · 1 รายการ)')).toBeInTheDocument()
    expect(screen.getByText('หัก ณ ที่จ่าย 3% (จาก 8,000.00 · 2 รายการ)')).toBeInTheDocument()
    expect(screen.getByText('−20.00')).toBeInTheDocument()
    expect(screen.getByText('−240.00')).toBeInTheDocument()
    expect(screen.getByText('11,740.00 บาท')).toBeInTheDocument()
  })
})

describe('on the printed sheet', () => {
  it('prints each line\'s rate in the withholding column', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={byLine} items={items} docNumber="X" settings={settings} />)
    const rates = [...container.querySelectorAll('tbody tr')].slice(0, 4).map(tr => tr.lastElementChild!.textContent)
    expect(rates).toEqual(['1%', '3%', '3%', ''])
  })

  it('prints one summary line per rate', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={byLine} items={items} docNumber="X" settings={settings} />)
    expect(within(container).getByText('หัก ณ ที่จ่าย 1% (ฐาน 2,000.00 · 1 รายการ)')).toBeInTheDocument()
    expect(within(container).getByText('หัก ณ ที่จ่าย 3% (ฐาน 8,000.00 · 2 รายการ)')).toBeInTheDocument()
    expect(within(container).getByText('11,740.00')).toBeInTheDocument()
  })
})
