import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { fillColumnPx, PX_PER_MM, SCREEN_PER_PRINT } from './calc'
import type { ExpenseHeader, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// The fill-in table is the size of the sheet's, and a column dragged wider
// there prints wider too: what is seen while typing is what comes out.

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text', width: 90 },
  { key: 'qty', label: 'จำนวน', type: 'number', width: 40 },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', width: 50, isTotal: true },
]
const header: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }
const items = [{ detail: 'บรรทัดแรก\nบรรทัดสอง', qty: 1, amount: 100 }]

const showForm = (h = header) => {
  const onHeaderChange = vi.fn()
  render(<ExpenseClaimForm header={h} items={items} columns={cols} showSeq seqWidth={10} onHeaderChange={onHeaderChange} onItemsChange={() => {}} />)
  return onHeaderChange
}
const headWidth = (label: string) => Number((screen.getByText(label, { selector: 'th' }) as HTMLElement).style.width.replace('px', ''))

describe('the fill-in table at the size of the sheet', () => {
  it('draws each column as wide as it prints', () => {
    showForm()
    expect(headWidth('รายละเอียด')).toBe(fillColumnPx(90))
    expect(headWidth('จำนวน')).toBe(fillColumnPx(40))
  })

  it('a dragged edge widens one column by what the next gives up, kept with the document', () => {
    const onHeaderChange = showForm()
    const edge = screen.getByRole('separator', { name: 'ปรับความกว้างคอลัมน์ รายละเอียด' })
    const px = 10 * PX_PER_MM * SCREEN_PER_PRINT   // 10mm on paper
    fireEvent.pointerDown(edge, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(edge, { clientX: 100 + px, pointerId: 1 })
    fireEvent.pointerUp(edge, { pointerId: 1 })
    const widths = onHeaderChange.mock.calls.at(-1)![0].colWidths
    expect(widths).toEqual({ detail: 100, qty: 30, amount: 50 })
  })

  it('the last column has no edge to drag — the sheet ends there', () => {
    showForm()
    expect(screen.queryByRole('separator', { name: /จำนวนเงิน/ })).not.toBeInTheDocument()
  })

  it('draws the document\'s own widths, and puts the form\'s back', () => {
    const onHeaderChange = showForm({ ...header, colWidths: { detail: 100, qty: 30, amount: 50 } })
    expect(headWidth('รายละเอียด')).toBe(fillColumnPx(100))
    fireEvent.click(screen.getByRole('button', { name: /คืนความกว้างคอลัมน์ตามฟอร์ม/ }))
    expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({ colWidths: undefined }))
  })
})

describe('the printed sheet', () => {
  const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols, seqWidth: 10 }

  it('prints the widths dragged on the fill-in table', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={{ ...header, colWidths: { detail: 100, qty: 30, amount: 50 } }} items={items} docNumber="X" settings={settings} />)
    const ths = [...container.querySelectorAll('thead th')] as HTMLElement[]
    expect(ths.map(th => th.style.width)).toEqual(['5.263%', '52.632%', '15.789%', '26.316%'])
  })

  it('keeps the line breaks typed into a detail', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={settings} />)
    const cell = [...container.querySelectorAll('tbody td')].find(td => td.textContent?.includes('บรรทัดแรก')) as HTMLElement
    expect(cell).toHaveClass('whitespace-pre-line')
  })
})
