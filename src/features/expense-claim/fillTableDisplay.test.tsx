import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import type { ExpenseRow, FormColumn } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const header = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }
const items: ExpenseRow[] = [{ detail: '', amount: '' }]
const show = (onItemsChange = vi.fn(), rows = items) => {
  render(<ExpenseClaimForm header={header} items={rows} columns={cols} onHeaderChange={() => {}} onItemsChange={onItemsChange} />)
  return onItemsChange
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
    const onItemsChange = show()
    fireEvent.change(screen.getByLabelText('รายละเอียด รายการที่ 1'), { target: { value: 'ทดสอบรายละเอียด' } })
    expect(onItemsChange.mock.calls[0][0][0].detail).toBe('ทดสอบรายละเอียด')
  })

  it('keeps a long detail whole, newlines and all', () => {
    const long = 'บจก.แอดริติค ค่าผลิตสติ๊กเกอร์ไดคัทตามแบบ\nสำหรับติดตั้งงานผนังบูธ Samsung AV'
    show(vi.fn(), [{ detail: long, amount: 1500 }])
    expect((screen.getByLabelText('รายละเอียด รายการที่ 1') as HTMLTextAreaElement).value).toBe(long)
  })
})

describe('the text size of the table', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* blocked */ } })

  it('offers เล็ก / ปกติ / ใหญ่, starting at ปกติ', () => {
    show()
    expect(screen.getByRole('radiogroup', { name: 'ขนาดตัวอักษรในตาราง' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'ปกติ' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'ใหญ่' })).not.toBeChecked()
  })

  it('changes the size of the cells', () => {
    show()
    const cell = () => screen.getByLabelText('รายละเอียด รายการที่ 1')
    expect(cell().className).toContain('text-xs')
    fireEvent.click(screen.getByRole('radio', { name: 'ใหญ่' }))
    expect(cell().className).toContain('text-sm')
    fireEvent.click(screen.getByRole('radio', { name: 'เล็ก' }))
    expect(cell().className).toContain('text-[11px]')
  })

  it('remembers the choice for next time', () => {
    show()
    fireEvent.click(screen.getByRole('radio', { name: 'ใหญ่' }))
    expect(localStorage.getItem('fillTable:textSize')).toBe('large')
  })
})
