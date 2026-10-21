import { fireEvent, render, screen } from '@testing-library/react'
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
const formOptions = () => [...screen.getByRole('combobox', { name: 'ฟอร์ม' }).querySelectorAll('option')].map(o => o.textContent)

describe('SubmissionFilterBar', () => {
  it('tells apart forms of the same name by their folder', () => {
    show()
    expect(formOptions()).toEqual(['— ฟอร์มทั้งหมด —', 'ใบอนุมัติค่าใช้จ่าย (ทั่วไป)', 'ใบอนุมัติค่าใช้จ่าย (DX)', 'ใบรับเงินคืนเข้าบริษัท'])
  })

  it('offers only the forms of the folder picked', () => {
    show({ ...emptyFilters, groupId: 'dx' })
    expect(formOptions()).toEqual(['— ฟอร์มทั้งหมด —', 'ใบอนุมัติค่าใช้จ่าย'])
  })

  it('drops a picked form that is not in the folder picked next', () => {
    const onChange = show({ ...emptyFilters, formType: 'r1' })
    fireEvent.change(screen.getByRole('combobox', { name: 'โฟลเดอร์' }), { target: { value: 'dx' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'dx', formType: '' }))
  })
})
