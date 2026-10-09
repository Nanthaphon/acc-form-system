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

// The body rows of the first sheet, the totals row left out.
const bodyRows = (container: HTMLElement) =>
  [...container.querySelectorAll('.doc-page')][0].querySelectorAll('tbody tr')

describe('the printed table ends where the document does', () => {
  it('draws a row for each item and nothing after it', () => {
    const items = [row('ค่าแท็กซี่', 380), row('ค่าที่พัก', 1200)]
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={settings} />)
    // two items + the รวมทั้งสิ้น row
    expect(bodyRows(container)).toHaveLength(3)
    expect(container.querySelectorAll('tbody tr')[2].textContent).toContain('รวมทั้งสิ้น')
  })

  it('a single item leaves no ruled rows under it', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={[row('ค่าแท็กซี่', 380)]} docNumber="X" settings={settings} />)
    expect(bodyRows(container)).toHaveLength(2)
  })

  it('a document with nothing in it prints no rows at all', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={[]} docNumber="X" settings={settings} />)
    expect(bodyRows(container)).toHaveLength(1)   // the totals row only
    expect(container.querySelectorAll('.doc-page')).toHaveLength(1)
  })

  it('still breaks onto a second sheet once the rows fill one', () => {
    const many = Array.from({ length: 40 }, (_, i) => row(`รายการที่ ${i + 1}`, 100))
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={many} docNumber="X" settings={settings} />)
    expect(container.querySelectorAll('.doc-page').length).toBeGreaterThan(1)
  })
})
