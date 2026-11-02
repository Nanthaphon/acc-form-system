import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupportTicket } from '../../data/support'

const api = vi.hoisted(() => ({
  listAllTickets: vi.fn(),
  setTicketStatus: vi.fn(),
  deleteTicket: vi.fn(),
  listMessages: vi.fn(),
  markRead: vi.fn(),
  imageUrls: vi.fn(),
  sendMessage: vi.fn(),
  createTicket: vi.fn(),
}))
vi.mock('../../data/support', async orig => ({ ...(await orig<typeof import('../../data/support')>()), ...api }))
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { uid: 'adm', role: 'admin' } }) }))
const dialogs = vi.hoisted(() => ({ uiAlert: vi.fn(), uiConfirm: vi.fn() }))
vi.mock('../../components/dialog/dialogService', () => dialogs)

const { default: SupportInboxPage } = await import('./SupportInboxPage')

const ticket = (id: string, o: Partial<SupportTicket>): SupportTicket => ({
  id, createdBy: 'emp', reporterName: 'สมชาย ใจดี', subject: `เรื่อง ${id}`, page: '/sign', status: 'open', createdAt: 1,
  lastMessageAt: 100, lastByReporter: true, lastPreview: 'ข้อความล่าสุด', messageCount: 1, reporterReadAt: 100, staffReadAt: 0, ...o,
})

const show = (url = '/admin/support') => render(<MemoryRouter initialEntries={[url]}><SupportInboxPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  api.listAllTickets.mockResolvedValue([
    ticket('a', { subject: 'บันทึกไม่ได้' }),
    ticket('b', { subject: 'พิมพ์ไม่ออก', status: 'doing', reporterName: 'อนุชา พรหมมา' }),
    ticket('c', { subject: 'เสร็จไปแล้ว', status: 'done', staffReadAt: 200 }),
  ])
  api.listMessages.mockResolvedValue([])
  api.markRead.mockResolvedValue(undefined)
  api.imageUrls.mockResolvedValue({})
  api.setTicketStatus.mockResolvedValue(undefined)
  api.deleteTicket.mockResolvedValue(undefined)
})

describe('รับเรื่องแจ้งปัญหา', () => {
  it('lists every conversation and counts them by status', async () => {
    show()
    expect(await screen.findByText('บันทึกไม่ได้')).toBeInTheDocument()
    expect(screen.getByText('พิมพ์ไม่ออก')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /ทั้งหมด 3/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /ใหม่ 1/ })).toBeInTheDocument()
  })

  it('filters by status and by name', async () => {
    show()
    await screen.findByText('บันทึกไม่ได้')
    fireEvent.click(screen.getByRole('tab', { name: /เสร็จแล้ว/ }))
    expect(screen.queryByText('บันทึกไม่ได้')).not.toBeInTheDocument()
    expect(screen.getByText('เสร็จไปแล้ว')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /ทั้งหมด/ }))
    fireEvent.change(screen.getByLabelText('ค้นหา'), { target: { value: 'อนุชา' } })
    expect(screen.getByText('พิมพ์ไม่ออก')).toBeInTheDocument()
    expect(screen.queryByText('บันทึกไม่ได้')).not.toBeInTheDocument()
  })

  it('marks what nobody on the admin side has read', async () => {
    show()
    await screen.findByText('บันทึกไม่ได้')
    expect(screen.getAllByLabelText('ยังไม่ได้อ่าน')).toHaveLength(2)
  })

  it('opens a conversation and moves it to เสร็จแล้ว', async () => {
    show()
    fireEvent.click(await screen.findByText('บันทึกไม่ได้'))
    const status = await screen.findByRole('radiogroup', { name: 'สถานะ' })
    fireEvent.click(within(status).getByRole('radio', { name: 'เสร็จแล้ว' }))
    await waitFor(() => expect(api.setTicketStatus).toHaveBeenCalledWith('a', 'done'))
    expect(within(status).getByRole('radio', { name: 'เสร็จแล้ว' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/จากหน้า/)).toBeInTheDocument()
  })

  it('deletes only after confirming', async () => {
    dialogs.uiConfirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    show('/admin/support?t=a')
    const del = await screen.findByLabelText('ลบเรื่องนี้')
    fireEvent.click(del)
    await waitFor(() => expect(dialogs.uiConfirm).toHaveBeenCalledTimes(1))
    expect(api.deleteTicket).not.toHaveBeenCalled()
    fireEvent.click(del)
    await waitFor(() => expect(api.deleteTicket).toHaveBeenCalledWith('a', []))
  })

  it('says what to run when the tables are not there yet', async () => {
    api.listAllTickets.mockRejectedValue(new Error('ระบบแชทแจ้งปัญหายังไม่พร้อม — ผู้ดูแลระบบต้องรัน supabase/2026-11-02-support-chat.sql ก่อน'))
    show()
    expect(await screen.findByText(/2026-11-02-support-chat\.sql/)).toBeInTheDocument()
  })
})
