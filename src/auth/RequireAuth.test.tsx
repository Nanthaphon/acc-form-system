import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import type { UserProfile } from '../types/schema'

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('./AuthProvider', () => ({ useAuth: () => auth.value }))

const profile = (over: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'u1', employeeId: 'E001', firstName: 'ส', lastName: 'ก', position: '', department: '',
  companyId: '', defaultJob: '', bankAccount: '', role: 'employee',
  mustChangePassword: false, createdAt: 0, ...over,
})

function show(at: string) {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/login" element={<div>หน้าเข้าสู่ระบบ</div>} />
        <Route path="/change-password" element={<RequireAuth><div>หน้าเปลี่ยนรหัสผ่าน</div></RequireAuth>} />
        <Route path="/" element={<RequireAuth><div>หน้าแรก</div></RequireAuth>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('waits rather than bouncing anyone out while the session is still loading', () => {
    auth.value = { user: null, profile: null, loading: true }
    show('/')
    expect(screen.queryByText('หน้าเข้าสู่ระบบ')).not.toBeInTheDocument()
    expect(screen.queryByText('หน้าแรก')).not.toBeInTheDocument()
  })

  it('sends a signed-out visitor to the login page', () => {
    auth.value = { user: null, profile: null, loading: false }
    show('/')
    expect(screen.getByText('หน้าเข้าสู่ระบบ')).toBeInTheDocument()
  })

  it('lets a signed-in employee through', () => {
    auth.value = { user: { id: 'u1' }, profile: profile(), loading: false }
    show('/')
    expect(screen.getByText('หน้าแรก')).toBeInTheDocument()
  })

  it('holds an account still on its default password at the change-password page', () => {
    auth.value = { user: { id: 'u1' }, profile: profile({ mustChangePassword: true }), loading: false }
    show('/')
    expect(screen.getByText('หน้าเปลี่ยนรหัสผ่าน')).toBeInTheDocument()
    expect(screen.queryByText('หน้าแรก')).not.toBeInTheDocument()
  })

  it('does not bounce that account away from the page it has to use', () => {
    auth.value = { user: { id: 'u1' }, profile: profile({ mustChangePassword: true }), loading: false }
    show('/change-password')
    expect(screen.getByText('หน้าเปลี่ยนรหัสผ่าน')).toBeInTheDocument()
  })

  it('never locks anyone out when the profile could not be loaded', () => {
    // A failed profile read must not look like "must change password".
    auth.value = { user: { id: 'u1' }, profile: null, loading: false }
    show('/')
    expect(screen.getByText('หน้าแรก')).toBeInTheDocument()
  })
})
