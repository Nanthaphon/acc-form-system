import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { taxSummary } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const items: ExpenseRow[] = [{ detail: 'a', amount: 1000 }]
const header: ExpenseHeader = {
  subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '',
  vat: true,
}

// The document in the report: 1,000 with VAT is 1,070, and that 1,070 is
// charged VAT again.
describe('a second round of tax, charged on the net', () => {
  it('charges the net, not the items', () => {
    const t = taxSummary(1000, true, 0, 0, undefined, { vat: true })
    expect(t.netAfterTax).toBe(1070)
    expect(t.vatOnNetAmount).toBe(74.9)     // 7% of 1,070, not of 1,000
    expect(t.netTotal).toBe(1144.9)
  })

  it('withholds from the net the same way', () => {
    const t = taxSummary(1000, true, 0, 0, undefined, { whtRate: 3 })
    expect(t.whtOnNetAmount).toBe(32.1)     // 3% of 1,070
    expect(t.netTotal).toBe(1037.9)
  })

  it('does both, in the order they are shown', () => {
    const t = taxSummary(1000, true, 0, 0, undefined, { vat: true, whtRate: 3 })
    expect(t.netTotal).toBe(1112.8)         // 1,070 + 74.90 − 32.10
  })

  it('leaves a document that never asked for it exactly as it was', () => {
    const t = taxSummary(1000, true, 3, 0)
    expect(t.vatOnNetAmount).toBe(0)
    expect(t.whtOnNetAmount).toBe(0)
    expect(t.netTotal).toBe(t.netAfterTax)
    expect(t.netTotal).toBe(1040)           // 1,000 + 70 − 30, as before
  })

  it('still charges the first round on the items, never on each other', () => {
    const t = taxSummary(1000, true, 3, 0, undefined, { vat: true })
    expect(t.vatAmount).toBe(70)            // 7% of 1,000
    expect(t.whtAmount).toBe(30)            // 3% of 1,000
    expect(t.netAfterTax).toBe(1040)
    expect(t.vatOnNetAmount).toBe(72.8)     // 7% of 1,040
  })
})

describe('turning it on while filling the form in', () => {
  const show = (h: ExpenseHeader = header, onHeaderChange = vi.fn()) => {
    render(<ExpenseClaimForm header={h} items={items} columns={cols} onHeaderChange={onHeaderChange} onItemsChange={vi.fn()} />)
    return onHeaderChange
  }

  it('is a choice of its own, saved with the document', () => {
    const onHeaderChange = show()
    fireEvent.click(screen.getByLabelText('VAT 7%'))
    expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({ vatOnNet: true }))
  })

  it('shows the figure it was worked out from, and the new net', () => {
    show({ ...header, vatOnNet: true })
    expect(screen.getByText('ยอดหลังภาษีชั้นแรก')).toBeInTheDocument()
    expect(screen.getByText(/ภาษีมูลค่าเพิ่ม 7% \(จากยอด 1,070\.00\)/)).toBeInTheDocument()
    expect(screen.getByText('1,144.90 บาท')).toBeInTheDocument()
  })

  it('says nothing about it until it is asked for', () => {
    show()
    expect(screen.queryByText('ยอดหลังภาษีชั้นแรก')).not.toBeInTheDocument()
    expect(screen.getByText('1,070.00 บาท')).toBeInTheDocument()
  })
})

describe('on the printed sheet', () => {
  const sheet = (h: ExpenseHeader) => {
    const { container } = render(
      <ExpenseClaimPreview company={null} header={h} items={items} docNumber="GAC-001"
        settings={{ ...EXPENSE_CLAIM_DEFAULTS, columns: cols }} />,
    )
    return container
  }

  it('prints the working: the first net, what is charged on it, the final net', () => {
    const c = sheet({ ...header, vatOnNet: true })
    expect(within(c).getByText('ยอดหลังภาษีชั้นแรก')).toBeInTheDocument()
    expect(within(c).getByText('ภาษีมูลค่าเพิ่ม 7% (จากยอดสุทธิ)')).toBeInTheDocument()
    expect(within(c).getByText('1,144.90')).toBeInTheDocument()
  })

  it('prints the document it always did when there is no second round', () => {
    const c = sheet(header)
    expect(within(c).queryByText('ยอดหลังภาษีชั้นแรก')).not.toBeInTheDocument()
  })
})
