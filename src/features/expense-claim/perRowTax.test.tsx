import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { taxBases, taxSummary, ROW_VAT_KEY, ROW_WHT_KEY } from './calc'
import type { ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const header = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: '', job: '' }
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols, perRowTax: true }
const row = (amount: number, ticks: Partial<ExpenseRow> = {}): ExpenseRow => ({ detail: '', amount, ...ticks })

// The DX sheet works this out by hand: its taxed total is a formula over the
// chosen rows (K12+K13+K15+K16), not a SUM of the column.
const items = [
  row(8000, { [ROW_WHT_KEY]: 1 }),            // a supplier's work: withheld
  row(2000, { [ROW_VAT_KEY]: 1 }),            // a VAT invoice
  row(1000),                                   // a hotel bill: neither
  row(500, { [ROW_VAT_KEY]: 1, [ROW_WHT_KEY]: 1 }),
]

describe('tax chosen per row', () => {
  it('works VAT and withholding out on the ticked rows only', () => {
    const bases = taxBases(cols, items, true)
    expect(bases).toEqual({ vat: 2500, wht: 8500 })
    const tax = taxSummary(11500, true, 3, 0, bases)
    expect(tax.subtotal).toBe(11500)      // every row still counts toward the total
    expect(tax.vatAmount).toBe(175)       // 7% of 2,500
    expect(tax.whtAmount).toBe(255)       // 3% of 8,500
    expect(tax.netTotal).toBe(11420)
  })

  it('leaves a form that charges the whole document exactly as it was', () => {
    expect(taxBases(cols, items, false)).toBeUndefined()
    const whole = taxSummary(11500, true, 3)
    expect(whole.vatAmount).toBe(805)     // 7% of the whole 11,500
    expect(whole.whtAmount).toBe(345)
  })

  it('nothing ticked means nothing charged, even with the rate on', () => {
    const bases = taxBases(cols, [row(5000)], true)
    expect(bases).toEqual({ vat: 0, wht: 0 })
    expect(taxSummary(5000, true, 3, 0, bases)).toMatchObject({ vatAmount: 0, whtAmount: 0, netTotal: 5000 })
  })

  it('ค่าประกันงาน is still held back on the whole subtotal', () => {
    const tax = taxSummary(11500, false, 0, 5, { vat: 0, wht: 0 })
    expect(tax.retentionAmount).toBe(575)
  })
})

describe('the fill table', () => {
  const show = (perRowTax: boolean, onItemsChange = vi.fn()) => {
    render(<ExpenseClaimForm header={{ ...header, vat: true, whtRate: 3 }} items={items} columns={cols}
      onHeaderChange={() => {}} onItemsChange={onItemsChange} perRowTax={perRowTax} />)
    return onItemsChange
  }

  it('offers a tick per row for each tax, and only when the form charges per row', () => {
    show(true)
    expect(screen.getByRole('checkbox', { name: 'VAT 7% รายการที่ 2' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'VAT 7% รายการที่ 3' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'หัก ณ ที่จ่าย รายการที่ 1' })).toBeChecked()
  })

  it('has no tick columns on an ordinary form', () => {
    show(false)
    expect(screen.queryByRole('checkbox', { name: /รายการที่/ })).not.toBeInTheDocument()
  })

  it('ticking a row puts the mark on that row', () => {
    const onItemsChange = show(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'VAT 7% รายการที่ 3' }))
    expect(onItemsChange.mock.calls[0][0][2][ROW_VAT_KEY]).toBe(1)
  })

  it('unticking takes it off again', () => {
    const onItemsChange = show(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'หัก ณ ที่จ่าย รายการที่ 1' }))
    expect(onItemsChange.mock.calls[0][0][0][ROW_WHT_KEY]).toBe('')
  })

  it('says so when a tax is switched on but no row is ticked', () => {
    render(<ExpenseClaimForm header={{ ...header, vat: true, whtRate: 3 }} items={[row(5000)]} columns={cols}
      onHeaderChange={() => {}} onItemsChange={() => {}} perRowTax />)
    expect(screen.getByText(/ยังไม่ได้ติ๊กรายการที่คิด/)).toBeInTheDocument()
  })

  it('shows the summary charging only the ticked rows', () => {
    show(true)
    expect(screen.getByText('ภาษีมูลค่าเพิ่ม 7% (เฉพาะรายการที่ติ๊ก)')).toBeInTheDocument()
    expect(screen.getByText('+175.00')).toBeInTheDocument()
    expect(screen.getByText('−255.00')).toBeInTheDocument()
  })
})

describe('the printed document', () => {
  it('prints a tick column for each tax, marking the rows charged', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={{ ...header, vat: true, whtRate: 3 }}
      items={items} docNumber="X" settings={settings} />)
    const heads = [...container.querySelectorAll('thead th')].map(th => th.textContent)
    expect(heads.slice(-2)).toEqual(['VAT\n7%', 'หัก ณ\nที่จ่าย'])
    const marks = [...container.querySelectorAll('tbody tr')].slice(0, 4)
      .map(tr => [...tr.children].slice(-2).map(td => td.textContent).join('|'))
    expect(marks).toEqual(['|☑', '☑|', '|', '☑|☑'])
  })

  it('an ordinary form prints no tick columns', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X"
      settings={{ ...settings, perRowTax: false }} />)
    expect([...container.querySelectorAll('thead th')].map(th => th.textContent)).not.toContain('VAT\n7%')
  })
})
