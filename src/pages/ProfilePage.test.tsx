import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './ProfilePage'
import { updateProfile } from '../data/users'
import { uiAlert } from '../components/dialog/dialogService'
import type { UserProfile } from '../types/schema'

// The profile as production loads it: select('*') on a database without the
// email column, so `email` is not there at all.
const ME: UserProfile = {
  uid: 'u1', employeeId: '1010091', firstName: 'พรทิพย์', lastName: 'รุ่งเรือง',
  position: 'Sr. ACC/FN Officer', department: 'Accounting and Finance', companyId: 'bhrm',
  defaultJob: 'ACC', bankAccount: '0093634810', role: 'admin', mustChangePassword: false,
  createdAt: 1, signatureImage: 'data:image/png;base64,AAAA', isSuperAdmin: false, passwordIsDefault: false,
}
const refresh = vi.fn(() => Promise.resolve())

vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ profile: ME, refresh }) }))
vi.mock('../data/users', () => ({ updateProfile: vi.fn() }))
vi.mock('../data/companies', () => ({ listCompanies: () => Promise.resolve([]) }))
vi.mock('../data/fieldOptions', () => ({
  loadOptionLists: () => Promise.resolve({ department: [], position: [], docStatus: [] }),
  NO_OPTIONS: { department: [], position: [], docStatus: [] },
}))
vi.mock('../components/dialog/dialogService', () => ({ uiAlert: vi.fn(), uiConfirm: vi.fn() }))

const save = () => fireEvent.click(screen.getByRole('button', { name: /บันทึก/ }))

beforeEach(() => vi.clearAllMocks())

describe('saving my profile', () => {
  it('sends only the fields this page edits — not the role, signature image or flags', async () => {
    vi.mocked(updateProfile).mockResolvedValue({ emailSkipped: false })
    render(<ProfilePage />)
    save()
    await waitFor(() => expect(uiAlert).toHaveBeenCalledWith('บันทึกข้อมูลแล้ว', { tone: 'success' }))
    expect(updateProfile).toHaveBeenCalledWith('u1', {
      firstName: 'พรทิพย์', lastName: 'รุ่งเรือง', position: 'Sr. ACC/FN Officer',
      department: 'Accounting and Finance', defaultJob: 'ACC', bankAccount: '0093634810', companyId: 'bhrm',
    })
  })

  it('a typed email the database cannot hold yet: saved without it, and says why', async () => {
    vi.mocked(updateProfile).mockResolvedValue({ emailSkipped: true })
    render(<ProfilePage />)
    fireEvent.change(screen.getByPlaceholderText('สำหรับแจ้งเตือนเอกสารรอเซ็น'), { target: { value: 'po@example.com' } })
    save()
    await waitFor(() => expect(uiAlert).toHaveBeenCalled())
    expect(vi.mocked(updateProfile).mock.calls[0][1]).toMatchObject({ email: 'po@example.com' })
    expect(vi.mocked(uiAlert).mock.calls[0][0]).toMatch('supabase/2026-10-26-employee-email.sql')
  })

  it('a failed save names the reason in Thai instead of "ลองใหม่อีกครั้ง"', async () => {
    vi.mocked(updateProfile).mockRejectedValue({ code: 'PGRST204', message: "Could not find the 'groupId' column of 'profiles' in the schema cache" })
    render(<ProfilePage />)
    save()
    await waitFor(() => expect(uiAlert).toHaveBeenCalled())
    expect(vi.mocked(uiAlert).mock.calls[0][0]).toMatch('ไม่พบคอลัมน์ groupId')
  })
})
