import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const person = {
  uid: 'p1', employeeId: '1010001', firstName: 'อ้อมฤทัย', lastName: 'โรจนภาสกร', nickname: 'Jib',
  position: 'Compensation& Benefit', department: 'Payroll', companyId: 'globe', email: 'jib@globe.co.th',
  role: 'employee', accessGroup: 'g1', passwordIsDefault: true, mustChangePassword: true, createdAt: 0,
  defaultJob: '', bankAccount: '', signatureImage: null,
}
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { uid: 'admin', role: 'admin', isSuperAdmin: true }, refresh: vi.fn() }) }))
vi.mock('../../data/users', () => ({ getProfileByUid: () => Promise.resolve(person) }))
vi.mock('../../data/submissions', async o => ({ ...(await o<object>()), listMySubmissions: () => Promise.resolve([]) }))
vi.mock('../../data/versions', async o => ({ ...(await o<object>()), getVersionCounts: () => Promise.resolve({}) }))
vi.mock('../../data/formSettings', () => ({ listForms: () => Promise.resolve([]) }))
vi.mock('../../data/formGroups', () => ({ listGroups: () => Promise.resolve([]) }))
vi.mock('../../data/companies', () => ({ listCompanies: () => Promise.resolve([{ id: 'globe', name: 'บริษัท โกลบ', shortName: 'Globe Syndicate', address: '' }]) }))
vi.mock('../../data/accessGroups', () => ({ listAccessGroups: () => Promise.resolve([{ id: 'g1', name: 'Payroll' }]) }))

const { default: EmployeeDetailPage } = await import('./EmployeeDetailPage')

describe('EmployeeDetailPage — one card for the person', () => {
  it('shows who it is, how they sign in and their signature together', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/employees/p1']}>
        <Routes><Route path="/admin/employees/:uid" element={<EmployeeDetailPage />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'อ้อมฤทัย โรจนภาสกร', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('(Jib)')).toBeInTheDocument()
    expect(screen.getByText('Globe Syndicate')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /เข้าสู่ระบบ/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ลายเซ็น/ })).toBeInTheDocument()
    expect(screen.getByText('รหัสเริ่มต้น')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ตั้งรหัสผ่านใหม่/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /แก้ชื่อผู้ใช้/ })).toBeInTheDocument()
  })
})
