import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SubmissionFilterBar from './SubmissionFilterBar'
import { emptyFilters } from '../shared/submissionFilter'
import type { Filters } from '../shared/submissionFilter'
import type { FormSettings } from '../types/schema'

const groups = [
  { id: 'general', name: 'ทั่วไป', sortOrder: 0, createdAt: 0 },
  { id: 'dx', name: 'DX', sortOrder: 1, createdAt: 0 },
]
const forms = [
  { formType: 'a1', name: 'ใบอนุมัติค่าใช้จ่าย', groupId: 'general' },
  { formType: 'a2', name: 'ใบอนุมัติค่าใช้จ่าย', groupId: 'dx' },
  { formType: 'r1', name: 'ใบรับเงินคืนเข้าบริษัท', groupId: 'general' },
] as FormSettings[]
const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId

const show = (value: Filters = emptyFilters, onChange = vi.fn()) => {
  render(<SubmissionFilterBar value={value} onChange={onChange} forms={forms} groups={groups} formGroup={formGroup} resultCount={0} />)
  return onChange
}
// Opens a filter's list and reads it: options, and the folder headings above them.
const open = (name: string) => { fireEvent.click(screen.getByRole('combobox', { name })); return screen.getByRole('listbox', { name }) }
const formOptions = () => within(open('ฟอร์ม')).getAllByRole('option').map(o => o.textContent)

describe('SubmissionFilterBar', () => {
  it('lists the forms under their folder, so two of the same name are told apart', () => {
    show()
    expect(formOptions()).toEqual(['ฟอร์มทั้งหมด', 'ใบอนุมัติค่าใช้จ่าย', 'ใบรับเงินคืนเข้าบริษัท', 'ใบอนุมัติค่าใช้จ่าย'])
    const list = screen.getByRole('listbox', { name: 'ฟอร์ม' })
    expect(list.textContent).toMatch(/ทั่วไป.*ใบอนุมัติค่าใช้จ่าย.*ใบรับเงินคืนเข้าบริษัท.*DX.*ใบอนุมัติค่าใช้จ่าย/)
  })

  it('offers only the forms of the folder picked', () => {
    show({ ...emptyFilters, groupId: 'dx' })
    expect(formOptions()).toEqual(['ฟอร์มทั้งหมด', 'ใบอนุมัติค่าใช้จ่าย'])
  })

  it('drops a picked form that is not in the folder picked next', () => {
    const onChange = show({ ...emptyFilters, formType: 'r1' })
    fireEvent.click(within(open('โฟลเดอร์')).getByRole('option', { name: 'DX' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'dx', formType: '' }))
  })

  it('ticks what is picked, and marks a filter in use', () => {
    show({ ...emptyFilters, formType: 'r1' })
    const button = screen.getByRole('combobox', { name: 'ฟอร์ม' })
    expect(button).toHaveTextContent('ใบรับเงินคืนเข้าบริษัท')
    expect(button.className).toContain('bg-clay-50')
    expect(screen.getByRole('combobox', { name: 'สถานะ' }).className).not.toContain('bg-clay-50')
    expect(within(open('ฟอร์ม')).getByRole('option', { selected: true })).toHaveTextContent('ใบรับเงินคืนเข้าบริษัท')
  })

  it('is worked from the keyboard: arrows to move, Enter to pick, Escape to close', () => {
    const onChange = show()
    const button = screen.getByRole('combobox', { name: 'สถานะ' })
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox', { name: 'สถานะ' })).toBeInTheDocument()
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }))
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(screen.queryByRole('listbox', { name: 'สถานะ' })).not.toBeInTheDocument()
  })

  it('a long list can be searched', () => {
    const employees = Array.from({ length: 12 }, (_, i) => ({ uid: `u${i}`, employeeId: `10${i}`, firstName: i === 7 ? 'กชกร' : `คน${i}`, lastName: 'ทดสอบ' }))
    render(<SubmissionFilterBar value={emptyFilters} onChange={vi.fn()} forms={forms} employees={employees as never} resultCount={0} />)
    const list = open('พนักงาน')
    fireEvent.change(screen.getByLabelText('ค้นหาพนักงาน'), { target: { value: 'กชกร' } })
    expect(within(list).getAllByRole('option').map(o => o.textContent)).toEqual(['กชกร ทดสอบ · 107'])
  })
})

describe('the bar\'s count and tools', () => {
  const bar = (value: Filters, resultCount: number, total?: number) =>
    render(<SubmissionFilterBar value={value} onChange={vi.fn()} forms={forms} resultCount={resultCount} total={total}
      extra={<button type="button">คอลัมน์</button>} />)

  it('offers ล้างตัวกรอง only once something is picked', () => {
    bar(emptyFilters, 110, 110)
    expect(screen.queryByRole('button', { name: /ล้างตัวกรอง/ })).not.toBeInTheDocument()
  })

  it('a filtered count says out of how many, and the page\'s tools sit on the same bar', () => {
    const { container } = bar({ ...emptyFilters, status: 'done' }, 12, 110)
    expect(screen.getByRole('button', { name: /ล้างตัวกรอง/ })).toBeInTheDocument()
    expect(container.textContent).toContain('12 จาก 110 รายการ')
    expect(screen.getByRole('button', { name: 'คอลัมน์' })).toBeInTheDocument()
  })

  it('an unfiltered count is just the count', () => {
    const { container } = bar(emptyFilters, 110, 110)
    expect(container.textContent).toContain('110 รายการ')
    expect(container.textContent).not.toContain('จาก')
  })
})
