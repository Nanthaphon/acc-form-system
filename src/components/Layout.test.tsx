import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../types/schema'

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))
vi.mock('../auth/AuthProvider', () => ({ useAuth }))
vi.mock('../shared/usePendingSignCount', () => ({ usePendingSignCount: () => 0 }))
vi.mock('../data/auth', () => ({ logout: vi.fn() }))

const { default: Layout } = await import('./Layout')

const person = (role: UserProfile['role']): UserProfile => ({
  uid: 'u1', employeeId: '1010145', firstName: 'ก', lastName: 'ข', position: '', department: '',
  companyId: 'globe', defaultJob: '', bankAccount: '', role, mustChangePassword: false, createdAt: 0,
})
const show = (role: UserProfile['role']) => {
  useAuth.mockReturnValue({ profile: person(role) })
  render(<MemoryRouter><Routes><Route path="/*" element={<Layout />} /></Routes></MemoryRouter>)
}

describe('sidebar', () => {
  // An admin has two history menus: their own documents and the company-wide
  // print history. Naming theirs keeps the two apart.
  it('names the admin\'s own history, and leaves the employee wording alone', () => {
    show('admin')
    expect(screen.getByRole('link', { name: /ประวัติของผู้ดูแลระบบ/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ประวัติพิมพ์ทั้งหมดในระบบ/ })).toBeInTheDocument()
  })

  it('shows an employee the plain wording and no admin menus', () => {
    show('employee')
    expect(screen.getByRole('link', { name: /^ประวัติ$/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ผู้ดูแลระบบ/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ประวัติพิมพ์ทั้งหมดในระบบ/ })).not.toBeInTheDocument()
  })
})
