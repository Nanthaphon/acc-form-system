import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const doc = (status: 'pending' | 'signed', voided?: object) => ({
  id: 's1', formType: 'expense', docNumber: 'GAC-0014', createdBy: 'me', createdAt: 1,
  header: { companyId: '' }, items: [], ...(voided ? { voided } : {}),
  signatures: [{ blockId: 'approver', blockLabel: 'ผู้อนุมัติ', assignedUid: 'boss', assignedName: 'พรทิพย์', status }],
})
let current: Record<string, unknown> = doc('pending')
// earlier rounds, by id, for the document page's ฉบับก่อนแก้ไข
let byId: Record<string, unknown> = {}
let profile: { uid: string; role: string; signatureImage?: string | null } = { uid: 'boss', role: 'employee', signatureImage: 'data:image/png;base64,AA' }

const signDocument = vi.fn(() => Promise.resolve())
const notifySigned = vi.fn(() => Promise.resolve(null))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ profile }) }))
vi.mock('../data/submissions', async o => ({
  ...(await o<typeof import('../data/submissions')>()),
  getSubmission: (id: string) => Promise.resolve(byId[id] ?? current),
  signDocument: (...a: unknown[]) => signDocument(...(a as [])),
}))
vi.mock('../data/notify', () => ({ notifySigned: (...a: unknown[]) => notifySigned(...(a as [])) }))
vi.mock('../data/formSettings', () => ({ getFormSettings: () => Promise.resolve({ formType: 'expense', columns: [], signatureBlocks: [] }) }))
vi.mock('../features/expense-claim/ExpenseClaimPreview', () => ({ default: () => <p>เนื้อเอกสาร</p> }))
vi.mock('../components/dialog/dialogService', () => ({ uiAlert: vi.fn(), uiConfirm: vi.fn(() => Promise.resolve(true)) }))

const { default: SubmissionPreviewPage } = await import('./SubmissionPreviewPage')
const show = () => render(
  <MemoryRouter initialEntries={['/submission/s1/preview']}>
    <Routes><Route path="/submission/:id/preview" element={<SubmissionPreviewPage />} /></Routes>
  </MemoryRouter>,
)

beforeEach(() => {
  current = doc('pending')
  byId = {}
  profile = { uid: 'boss', role: 'employee', signatureImage: 'data:image/png;base64,AA' }
  signDocument.mockClear(); notifySigned.mockClear()
})

describe('SubmissionPreviewPage — signing from the document a mail opened', () => {
  it('lets the person it waits on sign there, and tells the requester', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: /เซ็นช่อง ผู้อนุมัติ/ }))
    await waitFor(() => expect(signDocument).toHaveBeenCalledWith('s1', 'approver'))
    await waitFor(() => expect(notifySigned).toHaveBeenCalledWith('s1', 'approver'))
  })

  it('shows no sign button to anyone else, or once signed, or on a cancelled document', async () => {
    profile = { uid: 'someone-else', role: 'employee', signatureImage: 'x' }
    const { unmount } = show()
    await screen.findByText('เนื้อเอกสาร')
    expect(screen.queryByRole('button', { name: /เซ็นช่อง/ })).toBeNull()
    unmount()

    profile = { uid: 'boss', role: 'employee', signatureImage: 'x' }
    current = doc('signed')
    const second = show()
    await screen.findByText('เนื้อเอกสาร')
    expect(screen.queryByRole('button', { name: /เซ็นช่อง/ })).toBeNull()
    second.unmount()

    current = doc('pending', { reason: 'ผิด', at: 1 })
    show()
    await screen.findByText('เนื้อเอกสาร')
    expect(screen.queryByRole('button', { name: /เซ็นช่อง/ })).toBeNull()
  })

  it('points to uploading a signature when there is none yet', async () => {
    profile = { uid: 'boss', role: 'employee', signatureImage: null }
    show()
    expect(await screen.findByRole('link', { name: /อัปโหลดลายเซ็น/ })).toHaveAttribute('href', '/profile')
    expect(screen.queryByRole('button', { name: /เซ็นช่อง/ })).toBeNull()
  })
})

describe('SubmissionPreviewPage — the rounds before a correction', () => {
  it('lists every earlier round under the corrected document, newest first', async () => {
    const original = { ...doc('signed', { at: 1, reason: 'ยอดผิด', replacedById: 'r1', replacedByNumber: 'GAC-0014-R1' }), id: 'r0', docNumber: 'GAC-0014' }
    const r1 = { ...doc('signed', { at: 2, reason: 'ชื่อผิด', replacedById: 's1', replacedByNumber: 'GAC-0014-R2' }), id: 'r1', docNumber: 'GAC-0014-R1', replaces: { id: 'r0', docNumber: 'GAC-0014' } }
    current = { ...doc('signed'), docNumber: 'GAC-0014-R2', replaces: { id: 'r1', docNumber: 'GAC-0014-R1' } }
    byId = { r1, r0: original }
    show()
    const section = (await screen.findByText(/ฉบับก่อนแก้ไข/)).closest('section') as HTMLElement
    const numbers = await within(section).findAllByText(/^GAC-0014(-R1)?$/)
    expect(numbers.map(n => n.textContent)).toEqual(['GAC-0014-R1', 'GAC-0014'])
    expect(screen.getByText(/เหตุผลที่แก้: ชื่อผิด/)).toBeInTheDocument()
  })

  it('shows no such section on a document that corrects nothing', async () => {
    show()
    await screen.findByText('เนื้อเอกสาร')
    expect(screen.queryByText(/ฉบับก่อนแก้ไข/)).toBeNull()
  })
})
