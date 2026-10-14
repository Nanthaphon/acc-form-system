import { describe, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  const size = () => screen.getByRole('spinbutton', { name: 'ขนาดตัวอักษร (px)' }) as HTMLInputElement

  it('is a number of pixels, starting at 12', () => {
    show()
    expect(size().value).toBe('12')
  })

  it('steps up and down one pixel at a time, saved with the document', () => {
    const { onHeaderChange } = show(vi.fn(), items, { ...header, textSize: 15 })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มขนาดตัวอักษร' }))
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ textSize: 16 }))
    fireEvent.click(screen.getByRole('button', { name: 'ลดขนาดตัวอักษร' }))
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ textSize: 14 }))
  })

  it('stops at 10 and at 20', () => {
    show(vi.fn(), items, { ...header, textSize: 20 })
    expect(screen.getByRole('button', { name: 'เพิ่มขนาดตัวอักษร' })).toBeDisabled()
    cleanup()
    show(vi.fn(), items, { ...header, textSize: 10 })
    expect(screen.getByRole('button', { name: 'ลดขนาดตัวอักษร' })).toBeDisabled()
  })

  // Typed digit by digit, so "16" passes through "1": the size is only
  // taken, and kept within 10–20, once the typing is done.
  it('takes a typed size once typing is done, kept within 10–20', () => {
    const { onHeaderChange } = show()
    fireEvent.change(size(), { target: { value: '1' } })
    expect(onHeaderChange).not.toHaveBeenCalled()
    fireEvent.change(size(), { target: { value: '30' } })
    fireEvent.blur(size())
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ textSize: 20 }))
  })

  it('makes the cells being filled in that size', () => {
    show(vi.fn(), items, { ...header, textSize: 16 })
    expect(screen.getByLabelText('รายละเอียด รายการที่ 1')).toHaveStyle({ fontSize: '16px' })
  })

  it('reads the older เล็ก / ปกติ / ใหญ่ as 11 / 12 / 14', () => {
    for (const [old, px] of [['small', '11'], ['normal', '12'], ['large', '14'], [undefined, '12']] as const) {
      show(vi.fn(), items, { ...header, textSize: old })
      expect(size().value).toBe(px)
      cleanup()
    }
  })

  it('offers a way back to 12 only once it has moved', () => {
    show()
    expect(screen.queryByRole('button', { name: 'กลับเป็นขนาดปกติ' })).not.toBeInTheDocument()
    cleanup()
    const { onHeaderChange } = show(vi.fn(), items, { ...header, textSize: 17 })
    fireEvent.click(screen.getByRole('button', { name: 'กลับเป็นขนาดปกติ' }))
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ textSize: 12 }))
  })
})

describe('it changes what was typed into the table, and nothing else', () => {
  it('leaves the column headings on screen alone', () => {
    show(vi.fn(), items, { ...header, textSize: 'large' })
    const heading = screen.getByText('รายละเอียด')
    expect(heading.className).toContain('text-[11px]')
    expect(heading.className).not.toContain('text-sm')
  })

  const sheet = (textSize?: DocTextSize | number, rows: ExpenseRow[] = [{ detail: 'ค่าเดินทาง', amount: 500 }]) => render(
    <ExpenseClaimPreview
      company={null}
      header={{ ...header, textSize }}
      items={rows}
      docNumber="GAC-001"
      settings={{ ...EXPENSE_CLAIM_DEFAULTS, columns: cols }}
    />,
  ).container

  // The printed table is 10px where the screen is 12px, so it follows the
  // same proportion: 16px on screen is 13.33px on paper.
  it('prints the filled-in cells at the chosen size', () => {
    const page = sheet(16)
    const cells = [...page.querySelectorAll('tbody tr:first-child td')]
    expect(cells.map(td => (td as HTMLElement).style.fontSize)).toEqual(['13.33px', '13.33px', '13.33px'])
  })

  it('leaves the rest of the sheet as the form lays it out', () => {
    const page = sheet(20)
    expect([...page.querySelectorAll('thead th')].every(th => !(th as HTMLElement).style.fontSize)).toBe(true)
    const totals = [...page.querySelectorAll('tbody tr')].find(tr => tr.textContent?.includes('รวมทั้งสิ้น'))!
    expect([...totals.querySelectorAll('td')].every(td => !(td as HTMLElement).style.fontSize)).toBe(true)
    cleanup()
    const before = sheet()
    expect(before.querySelector('.doc-page')!.className).toBe(sheet(20).querySelector('.doc-page')!.className)
  })

  it('prints a document at the usual size exactly as it always printed', () => {
    const page = sheet()
    expect([...page.querySelectorAll('tbody td')].every(td => !(td as HTMLElement).style.fontSize)).toBe(true)
  })

  // Bigger text needs taller rows, so fewer of them fit on a sheet — or the
  // sheet would run off the bottom of the A4.
  it('fits fewer rows to a sheet the larger the text', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ detail: `รายการที่ ${i + 1}`, amount: 100 }))
    const sheets = (size?: number) => { const n = sheet(size, many).querySelectorAll('.doc-page').length; cleanup(); return n }
    expect(sheets(20)).toBeGreaterThan(sheets())
    expect(sheets(10)).toBeLessThanOrEqual(sheets())
  })
})
