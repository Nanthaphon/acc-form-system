import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import type { ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const header = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: '', job: '' }
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols }
const row = (detail: string, amount: number): ExpenseRow => ({ detail, amount })

const sheets = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.doc-page')]
// The totals rows under a sheet's table, as [label, amount].
const totals = (sheet: HTMLElement) => [...sheet.querySelectorAll('tbody tr.font-bold')]
  .map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent?.trim()))
const amountOf = (sheet: HTMLElement) =>
  [...sheet.querySelectorAll('tbody tr:not(.font-bold)')].reduce((s, tr) => s + Number(tr.lastElementChild!.textContent!.replace(/,/g, '')), 0)
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 })

describe('a document over several sheets', () => {
  // Every sheet used to print the whole document's total, so three sheets
  // looked like three claims for the same amount.
  const many = Array.from({ length: 40 }, (_, i) => row(`รายการที่ ${i + 1}`, 100 + i))
  const grand = many.reduce((s, r) => s + Number(r.amount), 0)

  it('sums each sheet on its own, and the last one sums them all as well', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={many} docNumber="X" settings={settings} />)
    const pages = sheets(container)
    expect(pages.length).toBeGreaterThan(1)
    pages.forEach((p, i) => {
      const own = ['รวมหน้านี้', money(amountOf(p))]
      expect(totals(p)).toEqual(i === pages.length - 1 ? [own, ['รวมทั้งสิ้นทุกหน้า', money(grand)]] : [own])
    })
    expect(pages.reduce((s, p) => s + amountOf(p), 0)).toBe(grand)
  })

  it('writes each sheet\'s own amount in words, and the whole on the last', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={many} docNumber="X" settings={settings} />)
    const pages = sheets(container)
    expect(pages[0].textContent).toContain('เป็นจำนวนเงินหน้านี้')
    expect(pages[pages.length - 1].textContent).toContain('เป็นจำนวนเงินรวมทุกหน้า')
  })

  it('prints the tax box once, on the last sheet', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={{ ...header, vat: true }} items={many} docNumber="X" settings={settings} />)
    const pages = sheets(container)
    expect(pages.map(p => p.textContent!.includes('ยอดสุทธิ'))).toEqual(pages.map((_, i) => i === pages.length - 1))
  })

  it('a single sheet is as before: one รวมทั้งสิ้น row', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={many.slice(0, 3)} docNumber="X" settings={settings} />)
    expect(totals(sheets(container)[0])).toEqual([['รวมทั้งสิ้น', money(303)]])
  })
})
