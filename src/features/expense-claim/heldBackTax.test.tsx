import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { FEATURES } from '../../shared/features'
import { ROW_VAT_KEY, TICK } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const items: ExpenseRow[] = [
  { detail: 'a', amount: 1000, [ROW_VAT_KEY]: TICK },
  { detail: 'b', amount: 1000 },
]
// A document carrying both of the held-back settings — saved by someone who
// tried them before they were held back, or by a later version.
const header: ExpenseHeader = {
  subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '',
  vat: true, vatScope: 'rows', whtRate: 3, whtScope: 'rows', vatOnNet: true, whtOnNetRate: 3,
}

// Both features are finished but not in use (shared/features). Nothing of
// either may show, and a document carrying their settings must come out as it
// would have before they existed: every tax on the whole document, charged
// once.
describe('while the two tax features are held back', () => {
  it('is what the switches say', () => {
    expect(FEATURES.taxPerRow).toBe(false)
    expect(FEATURES.taxOnNet).toBe(false)
  })

  it('offers neither on the fill-in screen', () => {
    render(<ExpenseClaimForm header={header} items={items} columns={cols} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    expect(screen.queryByRole('radiogroup', { name: /ขอบเขต/ })).not.toBeInTheDocument()
    expect(screen.queryByText('คิดซ้ำจากยอดสุทธิอีกชั้น')).not.toBeInTheDocument()
    expect(screen.queryByText('ยอดหลังภาษีชั้นแรก')).not.toBeInTheDocument()
  })

  it('charges the whole document once, whatever the document asked for', () => {
    render(<ExpenseClaimForm header={header} items={items} columns={cols} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    // 2,000 + 7% − 3% = 2,080, not 1,000-worth of ticked VAT or a second round
    expect(screen.getByText('2,080.00 บาท')).toBeInTheDocument()
  })

  it('prints the sheet it always printed — no tick columns, no second round', () => {
    const { container } = render(
      <ExpenseClaimPreview company={null} header={header} items={items} docNumber="GAC-001"
        settings={{ ...EXPENSE_CLAIM_DEFAULTS, columns: cols }} />,
    )
    expect(within(container).queryByText(/^VAT/)).not.toBeInTheDocument()
    expect(within(container).queryByText('ยอดหลังภาษีชั้นแรก')).not.toBeInTheDocument()
    expect(within(container).getByText('2,080.00')).toBeInTheDocument()
  })
})
