import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { taxBases, taxSummary, ROW_VAT_KEY, ROW_WHT_KEY } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { FEATURES } from '../../shared/features'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const base: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: '', job: '' }
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols }
const row = (amount: number, ticks: Partial<ExpenseRow> = {}): ExpenseRow => ({ detail: '', amount, ...ticks })

// The DX sheet works this out by hand: its taxed total is a formula over the
// chosen rows (K12+K13+K15+K16) rather than a SUM of the column.
const items = [
  row(8000, { [ROW_WHT_KEY]: 1 }),            // a supplier's work: withheld
  row(2000, { [ROW_VAT_KEY]: 1 }),            // a VAT invoice
  row(1000),                                   // a hotel bill: neither
  row(500, { [ROW_VAT_KEY]: 1, [ROW_WHT_KEY]: 1 }),
]

// Held back from the system for now, so the tests let it out for themselves.
beforeEach(() => { FEATURES.taxPerRow = true })
afterEach(() => { FEATURES.taxPerRow = false })

describe('what each tax is charged on', () => {
  it('charges everything by default — the way every document worked before', () => {
    expect(taxBases(cols, items, {})).toEqual({ vat: 11500, wht: 11500 })
    const tax = taxSummary(11500, true, 3, 0, taxBases(cols, items, {}))
    expect(tax.vatAmount).toBe(805)    // 7% of the whole 11,500
    expect(tax.whtAmount).toBe(345)
  })

  it('charges only the ticked lines when the document says so', () => {
    const bases = taxBases(cols, items, { vat: 'rows', wht: 'rows' })
    expect(bases).toEqual({ vat: 2500, wht: 8500 })
    const tax = taxSummary(11500, true, 3, 0, bases)
    expect(tax.subtotal).toBe(11500)   // every row still counts toward the total
    expect(tax.vatAmount).toBe(175)    // 7% of 2,500
    expect(tax.whtAmount).toBe(255)    // 3% of 8,500
    expect(tax.netTotal).toBe(11420)
  })

  it('decides the two separately: VAT on everything, withholding on chosen lines', () => {
    expect(taxBases(cols, items, { wht: 'rows' })).toEqual({ vat: 11500, wht: 8500 })
    expect(taxBases(cols, items, { vat: 'rows' })).toEqual({ vat: 2500, wht: 11500 })
  })

  it('nothing ticked means nothing charged, even with the rate on', () => {
    const bases = taxBases(cols, [row(5000)], { vat: 'rows', wht: 'rows' })
    expect(bases).toEqual({ vat: 0, wht: 0 })
    expect(taxSummary(5000, true, 3, 0, bases)).toMatchObject({ vatAmount: 0, whtAmount: 0, netTotal: 5000 })
  })

  it('ค่าประกันงาน is always held back on the whole subtotal', () => {
    expect(taxSummary(11500, false, 0, 5, { vat: 0, wht: 0 }).retentionAmount).toBe(575)
  })
})

describe('choosing it on the document', () => {
  const show = (header: ExpenseHeader, onHeaderChange = vi.fn(), onItemsChange = vi.fn()) => {
    render(<ExpenseClaimForm header={header} items={items} columns={cols}
      onHeaderChange={onHeaderChange} onItemsChange={onItemsChange} />)
    return { onHeaderChange, onItemsChange }
  }
  const taxed = { ...base, vat: true, whtRate: 3 }

  it('offers the choice once a tax is switched on, and starts on ทุกรายการ', () => {
    show(taxed)
    const vat = screen.getByRole('radiogroup', { name: 'ขอบเขต VAT' })
    expect(within(vat).getByRole('radio', { name: 'ทุกรายการ' })).toBeChecked()
    expect(within(vat).getByRole('radio', { name: 'เลือกรายการ' })).not.toBeChecked()
    const wht = screen.getByRole('radiogroup', { name: 'ขอบเขตหัก ณ ที่จ่าย' })
    expect(within(wht).getByRole('radio', { name: 'ทุกรายการ' })).toBeChecked()
  })

  it('offers no choice for a tax that is off', () => {
    show(base)
    expect(screen.queryByRole('radiogroup', { name: 'ขอบเขต VAT' })).not.toBeInTheDocument()
  })

  it('picking เลือกรายการ records it on the document', () => {
    const { onHeaderChange } = show(taxed)
    const vat = screen.getByRole('radiogroup', { name: 'ขอบเขต VAT' })
    fireEvent.click(within(vat).getByRole('radio', { name: 'เลือกรายการ' }))
    expect(onHeaderChange.mock.calls[0][0].vatScope).toBe('rows')
  })

  it('a tick column appears only for the tax charged by line', () => {
    show({ ...taxed, whtScope: 'rows' })
    expect(screen.getByRole('checkbox', { name: 'หัก ณ ที่จ่าย รายการที่ 1' })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: /^VAT 7% รายการ/ })).not.toBeInTheDocument()
  })

  it('ticking a row marks it, unticking clears it', () => {
    const { onItemsChange } = show({ ...taxed, vatScope: 'rows' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'VAT 7% รายการที่ 3' }))
    expect(onItemsChange.mock.calls[0][0][2][ROW_VAT_KEY]).toBe(1)
    fireEvent.click(screen.getByRole('checkbox', { name: 'VAT 7% รายการที่ 2' }))
    expect(onItemsChange.mock.calls[1][0][1][ROW_VAT_KEY]).toBe('')
  })

  it('says so when lines are to be picked but none are ticked', () => {
    render(<ExpenseClaimForm header={{ ...taxed, vatScope: 'rows' }} items={[row(5000)]} columns={cols}
      onHeaderChange={() => {}} onItemsChange={() => {}} />)
    expect(screen.getByText(/ยังไม่ได้ติ๊กรายการที่คิด/)).toBeInTheDocument()
  })

  it('the summary tells which way each tax was charged', () => {
    show({ ...taxed, whtScope: 'rows' })
    expect(screen.getByText('ภาษีมูลค่าเพิ่ม 7%')).toBeInTheDocument()            // everything
    // chosen lines — and what they add up to, so the figure can be checked
    expect(screen.getByText(/^หัก ณ ที่จ่าย 3% \(จาก [\d,.]+ · \d+ รายการ\)$/)).toBeInTheDocument()
    expect(screen.getByText('+805.00')).toBeInTheDocument()
    expect(screen.getByText('−255.00')).toBeInTheDocument()
  })
})

describe('the printed document', () => {
  const taxed = { ...base, vat: true, whtRate: 3 }

  it('prints a tick column for each tax charged by line, marking those rows', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={{ ...taxed, vatScope: 'rows', whtScope: 'rows' }}
      items={items} docNumber="X" settings={settings} />)
    const heads = [...container.querySelectorAll('thead th')].map(th => th.textContent)
    expect(heads.slice(-2)).toEqual(['VAT\n7%', 'หัก ณ\nที่จ่าย'])
    const marks = [...container.querySelectorAll('tbody tr')].slice(0, 4)
      .map(tr => [...tr.children].slice(-2).map(td => td.textContent).join('|'))
    expect(marks).toEqual(['|☑', '☑|', '|', '☑|☑'])
  })

  it('prints one column when only one tax is charged by line', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={{ ...taxed, whtScope: 'rows' }}
      items={items} docNumber="X" settings={settings} />)
    const heads = [...container.querySelectorAll('thead th')].map(th => th.textContent)
    expect(heads).toContain('หัก ณ\nที่จ่าย')
    expect(heads).not.toContain('VAT\n7%')
  })

  it('prints no tick column when both are charged on everything', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={taxed} items={items} docNumber="X" settings={settings} />)
    expect([...container.querySelectorAll('thead th')].map(th => th.textContent)).not.toContain('VAT\n7%')
  })
})
