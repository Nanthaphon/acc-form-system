import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listMessages: vi.fn(),
  createTicket: vi.fn(),
  sendMessage: vi.fn(),
  markRead: vi.fn(),
  imageUrls: vi.fn(),
}))
vi.mock('../../data/support', async orig => ({ ...(await orig<typeof import('../../data/support')>()), ...api }))
const { uiAlert } = vi.hoisted(() => ({ uiAlert: vi.fn() }))
vi.mock('../dialog/dialogService', () => ({ uiAlert }))

const { default: SupportThread } = await import('./SupportThread')

const msg = (id: string, fromUid: string, body: string, extra = {}) => ({
  id, ticketId: 't1', fromUid, fromName: fromUid === 'me' ? 'สมชาย ใจดี' : 'มาลี ศรีสุข', fromReporter: fromUid === 'me',
  body, images: [], createdAt: 1, ...extra,
})

beforeEach(() => {
  vi.clearAllMocks()
  api.listMessages.mockResolvedValue([])
  api.createTicket.mockResolvedValue('t-new')
  api.sendMessage.mockResolvedValue(undefined)
  api.markRead.mockResolvedValue(undefined)
  api.imageUrls.mockResolvedValue({})
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
})

describe('a conversation', () => {
  it('shows both sides and marks the other side\'s messages read', async () => {
    api.listMessages.mockResolvedValue([msg('1', 'me', 'บันทึกไม่ได้'), msg('2', 'adm', 'แก้ให้แล้ว')])
    render(<SupportThread ticketId="t1" viewerUid="me" />)
    expect(await screen.findByText('แก้ให้แล้ว')).toBeInTheDocument()
    expect(screen.getByText('บันทึกไม่ได้')).toBeInTheDocument()
    expect(screen.getByText(/ผู้ดูแลระบบ/)).toBeInTheDocument()
    await waitFor(() => expect(api.markRead).toHaveBeenCalledWith('t1'))
  })

  it('sends on Enter into the open conversation', async () => {
    render(<SupportThread ticketId="t1" viewerUid="me" />)
    const box = await screen.findByLabelText('ข้อความ')
    fireEvent.change(box, { target: { value: 'ยังไม่ได้ครับ' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledWith('t1', 'ยังไม่ได้ครับ', []))
    expect(api.createTicket).not.toHaveBeenCalled()
  })

  it('Shift+Enter is a new line, not a send', async () => {
    render(<SupportThread ticketId="t1" viewerUid="me" />)
    const box = await screen.findByLabelText('ข้อความ')
    fireEvent.change(box, { target: { value: 'บรรทัดแรก' } })
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true })
    expect(api.sendMessage).not.toHaveBeenCalled()
  })

  it('the first message opens a new conversation, from the page it was written on', async () => {
    const onCreated = vi.fn()
    render(<SupportThread ticketId={null} viewerUid="me" page="/form/f-claim" onCreated={onCreated} />)
    fireEvent.change(screen.getByLabelText('ข้อความ'), { target: { value: 'พิมพ์ไม่ออก' } })
    fireEvent.click(screen.getByLabelText('ส่ง'))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('t-new'))
    expect(api.createTicket).toHaveBeenCalledWith('พิมพ์ไม่ออก', '/form/f-claim')
    expect(api.sendMessage).toHaveBeenCalledWith('t-new', 'พิมพ์ไม่ออก', [])
  })

  it('a failed first message is retried into the same conversation, not a second one', async () => {
    api.sendMessage.mockRejectedValueOnce(new Error('network'))
    render(<SupportThread ticketId={null} viewerUid="me" />)
    fireEvent.change(screen.getByLabelText('ข้อความ'), { target: { value: 'x' } })
    fireEvent.click(screen.getByLabelText('ส่ง'))
    await waitFor(() => expect(uiAlert).toHaveBeenCalled())
    fireEvent.click(screen.getByLabelText('ส่ง'))
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalledTimes(2))
    expect(api.createTicket).toHaveBeenCalledTimes(1)
  })

  it('a pasted screenshot is attached and sent with the message', async () => {
    render(<SupportThread ticketId="t1" viewerUid="me" />)
    const box = await screen.findByLabelText('ข้อความ')
    const shot = new File(['x'], 'image.png', { type: 'image/png' })
    fireEvent.paste(box, { clipboardData: { files: [shot] } })
    expect(await screen.findByLabelText(/เอารูป ภาพหน้าจอ-.*\.png ออก/)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('ส่ง'))
    await waitFor(() => expect(api.sendMessage).toHaveBeenCalled())
    const [, body, files] = api.sendMessage.mock.calls[0]
    expect(body).toBe('')
    expect(files).toHaveLength(1)
    expect(files[0].type).toBe('image/png')
  })

  it('refuses a file that is not a picture', async () => {
    render(<SupportThread ticketId="t1" viewerUid="me" />)
    const box = await screen.findByLabelText('ข้อความ')
    fireEvent.paste(box, { clipboardData: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } })
    expect(uiAlert).toHaveBeenCalled()
    expect(screen.getByLabelText('ส่ง')).toBeDisabled()
  })

  it('nothing to send, nothing sent', async () => {
    render(<SupportThread ticketId="t1" viewerUid="me" />)
    const box = await screen.findByLabelText('ข้อความ')
    fireEvent.change(box, { target: { value: '   ' } })
    expect(screen.getByLabelText('ส่ง')).toBeDisabled()
  })
})
