import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { SubmissionSummary } from '../types/schema'

const ME = { uid: 'boss', employeeId: '1010001', firstName: 'ไกรธัช', lastName: 'จิระกรธนัน', signatureImage: 'data:image/png;base64,AA', role: 'employee' }
const doc = {
  id: 's1', formType: 'expense', docNumber: 'GAC-0011', createdBy: 'me', createdAt: 1, totals: { grandTotal: 100 },
  header: { firstName: 'นันทพล', lastName: 'นายาต' },
  signatures: [{ blockId: 'approver', blockLabel: 'ผู้อนุมัติ', assignedUid: 'boss', assignedName: 'ไกรธัช', status: 'pending' }],
} as unknown as SubmissionSummary

const signDocument = vi.fn(() => Promise.resolve())
const notifySigned = vi.fn(() => Promise.resolve(null))
const uiConfirm = vi.fn(() => Promise.resolve(true))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ profile: ME }) }))
vi.mock('../data/submissions', async importOriginal => ({
  ...(await importOriginal<typeof import('../data/submissions')>()),
  listMyAssigned: () => Promise.resolve([doc]),
  signDocument: (...a: unknown[]) => signDocument(...(a as [])),
  submissionAmount: () => 100,
}))
vi.mock('../data/notify', () => ({ notifySigned: (...a: unknown[]) => notifySigned(...(a as [])) }))
vi.mock('../data/formSettings', () => ({ listForms: () => Promise.resolve([{ formType: 'expense', name: 'ใบอนุมัติ' }]) }))
vi.mock('../components/dialog/dialogService', () => ({ uiAlert: vi.fn(), uiConfirm: (...a: unknown[]) => uiConfirm(...(a as [])) }))

const { default: SignInboxPage } = await import('./SignInboxPage')

beforeEach(() => { signDocument.mockClear(); notifySigned.mockClear(); uiConfirm.mockResolvedValue(true) })

describe('SignInboxPage — signing tells the requester', () => {
  it('emails the requester after the signature is saved', async () => {
    render(<MemoryRouter><SignInboxPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /เซ็นช่อง ผู้อนุมัติ/ }))
    await waitFor(() => expect(notifySigned).toHaveBeenCalledWith('s1', 'approver'))
    expect(signDocument).toHaveBeenCalledWith('s1', 'approver')
    expect(signDocument.mock.invocationCallOrder[0]).toBeLessThan(notifySigned.mock.invocationCallOrder[0])
  })

  it('sends nothing when the signing itself failed', async () => {
    signDocument.mockRejectedValueOnce(new Error('x'))
    render(<MemoryRouter><SignInboxPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /เซ็นช่อง ผู้อนุมัติ/ }))
    await waitFor(() => expect(signDocument).toHaveBeenCalled())
    expect(notifySigned).not.toHaveBeenCalled()
  })

  it('sends nothing when the signer backs out of the confirmation', async () => {
    uiConfirm.mockResolvedValue(false)
    render(<MemoryRouter><SignInboxPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /เซ็นช่อง ผู้อนุมัติ/ }))
    await waitFor(() => expect(uiConfirm).toHaveBeenCalled())
    expect(signDocument).not.toHaveBeenCalled()
    expect(notifySigned).not.toHaveBeenCalled()
  })
})
