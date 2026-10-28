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
const items: ExpenseRow[] = Array.from({ length: 40 }, (_, i) => ({ detail: `รายการ ${i + 1}`, amount: 100 }))
const stamps = (c: HTMLElement) => [...c.querySelectorAll('.doc-page')].map(p => [...p.querySelectorAll('span')].some(s => s.textContent === 'ยกเลิก'))

// A cancelled document still prints, as a record — never as a live claim.
describe('the printed sheet of a cancelled document', () => {
  it('is stamped ยกเลิก on every page', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={settings} voided />)
    const marks = stamps(container)
    expect(marks.length).toBeGreaterThan(1)
    expect(marks.every(Boolean)).toBe(true)
  })

  it('carries no stamp otherwise', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={settings} />)
    expect(stamps(container).some(Boolean)).toBe(false)
  })
})
