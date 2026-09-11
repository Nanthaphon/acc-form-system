import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChangeUsernameModal from './ChangeUsernameModal'
import type { UserProfile } from '../types/schema'

const { adminChangeUsername, uiAlert } = vi.hoisted(() => ({ adminChangeUsername: vi.fn(), uiAlert: vi.fn() }))
vi.mock('../data/users', () => ({ adminChangeUsername }))
vi.mock('./dialog/dialogService', () => ({ uiAlert }))

const emp: UserProfile = {
  uid: 'u1', employeeId: '1010122', firstName: 'สมชาย', lastName: 'ใจดี', position: '', department: '',
  companyId: '', defaultJob: '', bankAccount: '', role: 'employee', mustChangePassword: true, passwordIsDefault: true, createdAt: 0,
}

describe('ChangeUsernameModal', () => {
  beforeEach(() => { adminChangeUsername.mockReset(); uiAlert.mockReset() })

  it('renames and hands over the new login, password following a default one', async () => {
    adminChangeUsername.mockResolvedValue(undefined)
    const onDone = vi.fn()
    render(<ChangeUsernameModal profile={emp} onClose={() => {}} onDone={onDone} />)
    expect(screen.getByText(/จะเปลี่ยนเป็น/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('ชื่อผู้ใช้ใหม่'), { target: { value: ' Acc@GB ' } })
    fireEvent.click(screen.getByRole('button', { name: /บันทึกชื่อผู้ใช้/ }))
    await waitFor(() => expect(adminChangeUsername).toHaveBeenCalledWith('u1', 'Acc@GB'))
    expect(await screen.findByText(/เปลี่ยนชื่อผู้ใช้แล้ว/)).toBeInTheDocument()
    expect(screen.getAllByText('Acc@GB')).toHaveLength(2) // username + password boxes
    fireEvent.click(screen.getByRole('button', { name: 'เสร็จสิ้น' }))
    expect(onDone).toHaveBeenCalledWith('Acc@GB')
  })

  it('rejects a too-short username without calling the database', () => {
    render(<ChangeUsernameModal profile={emp} onClose={() => {}} onDone={() => {}} />)
    fireEvent.change(screen.getByLabelText('ชื่อผู้ใช้ใหม่'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: /บันทึกชื่อผู้ใช้/ }))
    expect(adminChangeUsername).not.toHaveBeenCalled()
    expect(uiAlert).toHaveBeenCalled()
  })

  it('explains a taken username in Thai', async () => {
    adminChangeUsername.mockRejectedValue({ code: 'P0001', message: 'username already in use' })
    render(<ChangeUsernameModal profile={{ ...emp, passwordIsDefault: false, mustChangePassword: false }} onClose={() => {}} onDone={() => {}} />)
    expect(screen.getByText(/รหัสผ่านเดิมยังใช้ได้/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('ชื่อผู้ใช้ใหม่'), { target: { value: 'admin001' } })
    fireEvent.click(screen.getByRole('button', { name: /บันทึกชื่อผู้ใช้/ }))
    await waitFor(() => expect(uiAlert).toHaveBeenCalledWith(expect.stringContaining('มีคนใช้แล้ว'), expect.anything()))
  })
})
