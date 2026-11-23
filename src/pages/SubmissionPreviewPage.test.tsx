import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const doc = (status: 'pending' | 'signed', voided?: object) => ({
  id: 's1', formType: 'expense', docNumber: 'GAC-0014', createdBy: 'me', createdAt: 1,
  header: { companyId: '' }, items: [], ...(voided ? { voided } : {}),
  signatures: [{ blockId: 'approver', blockLabel: 'ผู้อนุมัติ', assignedUid: 'boss', assignedName: 'พรทิพย์', status }],
})
let current = doc('pending')
let profile: { uid: string; role: string; signatureImage?: string | null } = { uid: 'boss', role: 'employee', signatureImage: 'data:image/png;base64,AA' }

const signDocument = vi.fn(() => Promise.resolve())
const notifySigned = vi.fn(() => Promise.resolve(null))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ profile }) }))
vi.mock('../data/submissions', async o => ({
  ...(await o<typeof import('../data/submissions')>()),
  getSubmission: () => Promise.resolve(current),
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
