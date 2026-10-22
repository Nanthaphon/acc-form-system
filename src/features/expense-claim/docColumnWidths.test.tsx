import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { fillColumnPx } from './calc'
import type { ExpenseHeader, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// The fill-in table is the size of the sheet's: what is seen while typing is
// what comes out. Its columns are the form's; they are not dragged.

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text', width: 90 },
  { key: 'qty', label: 'จำนวน', type: 'number', width: 40 },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', width: 50, isTotal: true },
]
const header: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }
const items = [{ detail: 'บรรทัดแรก\nบรรทัดสอง', qty: 1, amount: 100 }]

const showForm = (h: ExpenseHeader = header) =>
  render(<ExpenseClaimForm header={h} items={items} columns={cols} showSeq seqWidth={10} onHeaderChange={() => {}} onItemsChange={() => {}} />)
const headWidth = (label: string) => Number((screen.getByText(label, { selector: 'th' }) as HTMLElement).style.width.replace('px', ''))

describe('the fill-in table at the size of the sheet', () => {
  it('draws each column as wide as it prints', () => {
    showForm()
    expect(headWidth('รายละเอียด')).toBe(fillColumnPx(90))
    expect(headWidth('จำนวน')).toBe(fillColumnPx(40))
  })

  it('has no column edges to drag, nor a way back from them', () => {
    showForm()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /คืนความกว้างคอลัมน์/ })).not.toBeInTheDocument()
  })

  it('uses the form\'s widths for a document that had its columns dragged before', () => {
    showForm({ ...header, colWidths: { detail: 100, qty: 30, amount: 50 } } as ExpenseHeader)
    expect(headWidth('รายละเอียด')).toBe(fillColumnPx(90))
  })
})

describe('the printed sheet', () => {
  const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols, seqWidth: 10 }

  it('prints the form\'s widths, whatever a document once had dragged', () => {
    const dragged = { ...header, colWidths: { detail: 100, qty: 30, amount: 50 } } as ExpenseHeader
    const { container } = render(<ExpenseClaimPreview company={null} header={dragged} items={items} docNumber="X" settings={settings} />)
    const ths = [...container.querySelectorAll('thead th')] as HTMLElement[]
    expect(ths.map(th => th.style.width)).toEqual(['5.263%', '47.368%', '21.053%', '26.316%'])
  })

  it('keeps the line breaks typed into a detail', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={settings} />)
    const cell = [...container.querySelectorAll('tbody td')].find(td => td.textContent?.includes('บรรทัดแรก')) as HTMLElement
    expect(cell).toHaveClass('whitespace-pre-line')
  })
})
