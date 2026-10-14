import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { FEATURES } from '../../shared/features'
import type { ExpenseHeader, ExpenseRow, FormColumn } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const items: ExpenseRow[] = [
  { detail: 'a', amount: 1000 },
  { detail: 'b', amount: 1000 },
]
// A document carrying the held-back setting — saved by someone who tried it
// before it was held back, or by a later version.
const header: ExpenseHeader = {
  subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '',
  vat: true, whtRate: 3, vatOnNet: true, whtOnNetRate: 3,
}

// Tax on lines picked one by one went live on 2026-10-14 (whtRatePerRow and
// taxScope tests). The second round, charged on the net, is still finished
// but not in use (shared/features): nothing of it may show, and a document
// carrying its settings must come out charged once, as it always was.
describe('while the second round of tax is held back', () => {
  it('is what the switches say', () => {
    expect(FEATURES.taxPerRow).toBe(true)
    expect(FEATURES.taxOnNet).toBe(false)
  })

  it('is not offered on the fill-in screen', () => {
    render(<ExpenseClaimForm header={header} items={items} columns={cols} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    expect(screen.queryByText('คิดซ้ำจากยอดสุทธิอีกชั้น')).not.toBeInTheDocument()
    expect(screen.queryByText('ยอดหลังภาษีชั้นแรก')).not.toBeInTheDocument()
  })

  it('charges the whole document once, whatever the document asked for', () => {
    render(<ExpenseClaimForm header={header} items={items} columns={cols} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    // 2,000 + 7% − 3% = 2,080, not a second round on top
    expect(screen.getByText('2,080.00 บาท')).toBeInTheDocument()
  })

  it('prints no second round', () => {
    const { container } = render(
      <ExpenseClaimPreview company={null} header={header} items={items} docNumber="GAC-001"
        settings={{ ...EXPENSE_CLAIM_DEFAULTS, columns: cols }} />,
    )
    expect(within(container).queryByText('ยอดหลังภาษีชั้นแรก')).not.toBeInTheDocument()
    expect(within(container).getByText('2,080.00')).toBeInTheDocument()
  })
})
