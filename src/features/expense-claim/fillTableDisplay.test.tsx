import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import type { DocTextSize, ExpenseHeader, ExpenseRow, FormColumn } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const header: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }
const items: ExpenseRow[] = [{ detail: '', amount: '' }]
const show = (onItemsChange = vi.fn(), rows = items, h: ExpenseHeader = header, onHeaderChange = vi.fn()) => {
  render(<ExpenseClaimForm header={h} items={rows} columns={cols} onHeaderChange={onHeaderChange} onItemsChange={onItemsChange} />)
  return { onItemsChange, onHeaderChange }
}

describe('a text cell grows with its text', () => {
  it('is a field that wraps rather than scrolling the text out of sight', () => {
    show()
    const cell = screen.getByLabelText('รายละเอียด รายการที่ 1')
    expect(cell.tagName).toBe('TEXTAREA')
    expect(cell).toHaveAttribute('rows', '1')
    expect(cell.className).toContain('resize-none')
  })

  it('types into the row like the old field did', () => {
    const { onItemsChange } = show()
    fireEvent.change(screen.getByLabelText('รายละเอียด รายการที่ 1'), { target: { value: 'ทดสอบรายละเอียด' } })
    expect(onItemsChange.mock.calls[0][0][0].detail).toBe('ทดสอบรายละเอียด')
  })

  it('keeps a long detail whole, newlines and all', () => {
    const long = 'บจก.แอดริติค ค่าผลิตสติ๊กเกอร์ไดคัทตามแบบ\nสำหรับติดตั้งงานผนังบูธ Samsung AV'
    show(vi.fn(), [{ detail: long, amount: 1500 }])
    expect((screen.getByLabelText('รายละเอียด รายการที่ 1') as HTMLTextAreaElement).value).toBe(long)
  })
})

describe('the text size', () => {
  it('offers เล็ก / ปกติ / ใหญ่, starting at ปกติ', () => {
    show()
    expect(screen.getByRole('radiogroup', { name: 'ขนาดตัวอักษร' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'ปกติ' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'ใหญ่' })).not.toBeChecked()
  })

  it('belongs to the document, so it is saved with it', () => {
    const { onHeaderChange } = show()
    fireEvent.click(screen.getByRole('radio', { name: 'ใหญ่' }))
    expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({ textSize: 'large' }))
  })

  it('changes the size of the cells being filled in', () => {
    show(vi.fn(), items, { ...header, textSize: 'large' })
    expect(screen.getByLabelText('รายละเอียด รายการที่ 1').className).toContain('text-sm')
  })

  it('reads a document saved before the choice existed as ปกติ', () => {
    show(vi.fn(), items, { ...header, textSize: undefined })
    expect(screen.getByRole('radio', { name: 'ปกติ' })).toBeChecked()
    expect(screen.getByLabelText('รายละเอียด รายการที่ 1').className).toContain('text-xs')
  })
})

describe('the document itself follows the chosen size', () => {
  const sheet = (textSize?: DocTextSize) => {
    const { container } = render(
      <ExpenseClaimPreview
        company={null}
        header={{ ...header, textSize }}
        items={[{ detail: 'ค่าเดินทาง', amount: 500 }]}
        docNumber="GAC-001"
        settings={{ ...EXPENSE_CLAIM_DEFAULTS, columns: cols }}
      />,
    )
    return container.querySelector('.doc-page') as HTMLElement
  }

  it('prints at its usual size when nothing was chosen', () => {
    expect(sheet().style.fontSize).toBe('12px')
  })

  it('prints smaller at เล็ก and larger at ใหญ่', () => {
    expect(parseFloat(sheet('small').style.fontSize)).toBeLessThan(12)
    expect(parseFloat(sheet('large').style.fontSize)).toBeGreaterThan(12)
  })

  it('sizes the table from the sheet, so it grows with it', () => {
    expect(sheet('large').querySelector('table')?.className).toContain('text-[0.833em]')
  })
})
