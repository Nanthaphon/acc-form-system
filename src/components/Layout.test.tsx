import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../types/schema'
import { markAnnouncementsSeen } from '../shared/announcements'

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))
vi.mock('../auth/AuthProvider', () => ({ useAuth }))
vi.mock('../shared/usePendingSignCount', () => ({ usePendingSignCount: () => 0 }))
vi.mock('../data/auth', () => ({ logout: vi.fn() }))
const { support } = vi.hoisted(() => ({ support: { mine: 0, inbox: 0, available: true } }))
vi.mock('../shared/useSupportUnread', () => ({ useSupportUnread: () => support, notifySupportChanged: () => {} }))

const { default: Layout } = await import('./Layout')

const person = (role: UserProfile['role']): UserProfile => ({
  uid: 'u1', employeeId: '1010145', firstName: 'ก', lastName: 'ข', position: '', department: '',
  companyId: 'globe', defaultJob: '', bankAccount: '', role, mustChangePassword: false, createdAt: 0,
})
const show = (role: UserProfile['role'], at = '/') => {
  useAuth.mockReturnValue({ profile: person(role) })
  render(<MemoryRouter initialEntries={[at]}><Routes><Route path="/*" element={<Layout />} /></Routes></MemoryRouter>)
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

describe('manual menu', () => {
  it('everyone gets the manual in the sidebar', () => {
    show('employee')
    expect(screen.getByRole('link', { name: /คู่มือการใช้งาน/ })).toHaveAttribute('href', '/manual')
  })
})

describe('announcements menu', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* blocked */ } })

  it('everyone gets the announcements in the sidebar', () => {
    show('employee')
    expect(screen.getByRole('link', { name: /ประกาศ/ })).toHaveAttribute('href', '/announcements')
  })

  // The dot is how someone knows to look; without it an announcement is only
  // found by chance.
  it('marks the menu while there is something unread, and stops once it is read', () => {
    show('employee')
    expect(screen.getByLabelText('มีประกาศใหม่')).toBeInTheDocument()
    cleanup()

    markAnnouncementsSeen()
    show('employee')
    expect(screen.queryByLabelText('มีประกาศใหม่')).not.toBeInTheDocument()
  })
})

describe('แจ้งปัญหา', () => {
  beforeEach(() => { Object.assign(support, { mine: 0, inbox: 0, available: true }) })

  it('everyone gets the chat button; only admins get the inbox', () => {
    show('employee')
    expect(screen.getByRole('button', { name: 'แจ้งปัญหาถึงผู้ดูแลระบบ' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /รับเรื่องแจ้งปัญหา/ })).not.toBeInTheDocument()
    cleanup()
    show('admin')
    expect(screen.getByRole('link', { name: /รับเรื่องแจ้งปัญหา/ })).toHaveAttribute('href', '/admin/support')
  })

  it('counts replies on the button and waiting conversations on the admin menu', () => {
    Object.assign(support, { mine: 2, inbox: 3 })
    show('admin')
    expect(screen.getByLabelText('มีคำตอบใหม่ 2 เรื่อง')).toBeInTheDocument()
    expect(screen.getByLabelText('รอตอบ 3 เรื่อง')).toBeInTheDocument()
  })

  it('no button until the database is set up, nor on the inbox itself', () => {
    support.available = false
    show('employee')
    expect(screen.queryByRole('button', { name: 'แจ้งปัญหาถึงผู้ดูแลระบบ' })).not.toBeInTheDocument()
    cleanup()
    support.available = true
    show('admin', '/admin/support')
    expect(screen.queryByRole('button', { name: 'แจ้งปัญหาถึงผู้ดูแลระบบ' })).not.toBeInTheDocument()
  })
})
