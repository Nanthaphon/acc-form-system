import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { UserProfile } from '../../types/schema'

const person = (uid: string, employeeId: string, firstName: string, extra: Partial<UserProfile> = {}): UserProfile => ({
  uid, employeeId, firstName, lastName: 'ทดสอบ', position: '', department: '', companyId: 'globe',
  defaultJob: '', bankAccount: '', role: 'employee', mustChangePassword: true, createdAt: 0, ...extra,
})
const ME = person('me', '1010145', 'ผู้ดูแล', { role: 'admin' })
const SUPER = person('su', '1010002', 'ซูเปอร์', { role: 'admin', isSuperAdmin: true } as Partial<UserProfile>)
const PEOPLE = [ME, SUPER, person('a', '1010009', 'เยาวลักษณ์', { department: 'Payroll', accessGroup: 'g1' }), person('b', '1010012', 'ปรมินทร์', { department: 'Management', accessGroup: 'g2' }), person('c', '1010027', 'วุฑฒิกานต์', { department: 'Payroll' })]

const deleteEmployee = vi.fn((_uid: string) => Promise.resolve())
const uiPrompt = vi.fn()
vi.mock('../../data/users', () => ({
  listEmployees: () => Promise.resolve(PEOPLE),
  deleteEmployee: (uid: string) => deleteEmployee(uid),
}))
vi.mock('../../data/companies', () => ({ listCompanies: () => Promise.resolve([]) }))
vi.mock('../../data/accessGroups', () => ({ listAccessGroups: () => Promise.resolve([{ id: 'g1', name: 'บัญชี', sortOrder: 0, createdAt: 0 }, { id: 'g2', name: 'จัดซื้อ', sortOrder: 1, createdAt: 0 }]) }))
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ profile: ME }) }))
vi.mock('../../components/dialog/dialogService', () => ({
  uiAlert: vi.fn(() => Promise.resolve(true)),
  uiConfirm: vi.fn(() => Promise.resolve(true)),
  uiPrompt: (...a: unknown[]) => uiPrompt(...a),
}))

const { default: EmployeeListPage } = await import('./EmployeeListPage')

const show = async () => {
  render(<MemoryRouter><EmployeeListPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText('ปรมินทร์ ทดสอบ')).toBeInTheDocument())
}
const box = (name: string) => screen.getByRole('checkbox', { name: `เลือก ${name} ทดสอบ` }) as HTMLInputElement
const selectAll = () => screen.getByRole('checkbox', { name: 'เลือกทั้งหมด' })

describe('EmployeeListPage — selecting and deleting several at once', () => {
  beforeEach(() => { deleteEmployee.mockClear(); uiPrompt.mockReset() })

  // The same rule as the single delete button, which the database enforces too.
  it('never lets you tick yourself or the Super Admin', async () => {
    await show()
    expect(box('ผู้ดูแล')).toBeDisabled()
    expect(box('ซูเปอร์')).toBeDisabled()
    expect(box('ปรมินทร์')).toBeEnabled()
  })

  it('select all ticks everyone who can be deleted, and no one else', async () => {
    await show()
    fireEvent.click(selectAll())
    expect(box('เยาวลักษณ์').checked).toBe(true)
    expect(box('ปรมินทร์').checked).toBe(true)
    expect(box('วุฑฒิกานต์').checked).toBe(true)
    expect(box('ผู้ดูแล').checked).toBe(false)
    expect(screen.getByRole('button', { name: /ลบ 3 คน/ })).toBeInTheDocument()
  })

  // What gets ticked should be what can be seen.
  it('select all covers only the people the search is showing', async () => {
    await show()
    fireEvent.change(screen.getByPlaceholderText(/ค้นหา/), { target: { value: 'ปรมินทร์' } })
    fireEvent.click(selectAll())
    expect(screen.getByRole('button', { name: /ลบ 1 คน/ })).toBeInTheDocument()
  })

  it('deletes nothing unless the number is typed back', async () => {
    await show()
    fireEvent.click(selectAll())
    uiPrompt.mockResolvedValueOnce('2')
    fireEvent.click(screen.getByRole('button', { name: /ลบ 3 คน/ }))
    await waitFor(() => expect(uiPrompt).toHaveBeenCalled())
    expect(deleteEmployee).not.toHaveBeenCalled()
  })

  it('deletes each ticked person once the number is typed', async () => {
    await show()
    fireEvent.click(box('เยาวลักษณ์'))
    fireEvent.click(box('วุฑฒิกานต์'))
    uiPrompt.mockResolvedValueOnce('2')
    fireEvent.click(screen.getByRole('button', { name: /ลบ 2 คน/ }))
    await waitFor(() => expect(deleteEmployee).toHaveBeenCalledTimes(2))
    expect(deleteEmployee.mock.calls.map(c => c[0])).toEqual(['a', 'c'])
  })
})

describe('filters', () => {
  const names = () => screen.getAllByRole('row').length - 1 // minus the header row

  it('narrows the list by department, and clears again', async () => {
    await show()
    fireEvent.change(screen.getByLabelText('กรองตามแผนก'), { target: { value: 'Payroll' } })
    expect(screen.getByText('เยาวลักษณ์ ทดสอบ')).toBeInTheDocument()
    expect(screen.queryByText('ปรมินทร์ ทดสอบ')).not.toBeInTheDocument()
    expect(names()).toBe(2)
    expect(screen.getByText(/แสดง 2 จาก 5 คน/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ล้างตัวกรอง/ }))
    expect(screen.getByText('ปรมินทร์ ทดสอบ')).toBeInTheDocument()
  })

  it('narrows the list by access group, including the people without one', async () => {
    await show()
    fireEvent.change(screen.getByLabelText('กรองตามกลุ่มสิทธิ์'), { target: { value: 'g2' } })
    expect(screen.getByText('ปรมินทร์ ทดสอบ')).toBeInTheDocument()
    expect(names()).toBe(1)

    fireEvent.change(screen.getByLabelText('กรองตามกลุ่มสิทธิ์'), { target: { value: '-' } })
    expect(screen.getByText('วุฑฒิกานต์ ทดสอบ')).toBeInTheDocument()
    expect(screen.queryByText('ปรมินทร์ ทดสอบ')).not.toBeInTheDocument()
  })

  it('combines the search box with a filter', async () => {
    await show()
    fireEvent.change(screen.getByLabelText('กรองตามแผนก'), { target: { value: 'Payroll' } })
    fireEvent.change(screen.getByPlaceholderText(/ค้นหา/), { target: { value: 'วุฑฒิ' } })
    expect(names()).toBe(1)
    expect(screen.getByText('วุฑฒิกานต์ ทดสอบ')).toBeInTheDocument()
  })
})
