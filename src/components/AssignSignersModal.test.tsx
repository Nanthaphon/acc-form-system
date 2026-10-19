import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AssignSignersModal from './AssignSignersModal'
import { assignSigners, signDocument, unsignDocument } from '../data/submissions'
import type { DocSignature, FormSettings, SubmissionSummary } from '../types/schema'

vi.mock('../data/submissions', () => ({
  assignSigners: vi.fn(() => Promise.resolve()),
  signDocument: vi.fn(() => Promise.resolve()),
  unsignDocument: vi.fn(() => Promise.resolve()),
}))
vi.mock('./dialog/dialogService', () => ({ uiAlert: vi.fn() }))

const settings = { name: 'ใบรับเงินคืน', signatureBlocks: [{ id: 'maker', label: 'ผู้จัดทำเอกสาร' }, { id: 'checker', label: 'ผู้ตรวจสอบ' }] } as FormSettings
const signers = [{ uid: 'boss', name: 'ไกรธัช จิระกรธนัน' }, { uid: 'u1', name: 'นันทพล นายาต' }]
const mine = (status: 'signed' | 'pending'): DocSignature =>
  ({ blockId: 'maker', blockLabel: 'ผู้จัดทำเอกสาร', assignedUid: 'u1', assignedName: 'นันทพล นายาต', status, ...(status === 'signed' ? { signedAt: 1 } : {}) })

const show = (signatures: DocSignature[] = [], signature: string | null = 'data:image/png;base64,AA') => render(
  <MemoryRouter>
    <AssignSignersModal
      submission={{ id: 's1', docNumber: 'GAC-0011', signatures } as unknown as SubmissionSummary}
      settings={settings} signers={signers} currentUid="u1" currentName="นันทพล นายาต" currentSignature={signature}
      onClose={() => {}} onDone={() => {}}
    />
  </MemoryRouter>,
)
const pickHead = () => {
  fireEvent.focus(screen.getByRole('textbox', { name: 'ผู้เซ็นช่อง ผู้ตรวจสอบ' }))
  fireEvent.click(screen.getByRole('button', { name: 'ไกรธัช จิระกรธนัน' }))
}

beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

describe('เซ็น / ส่งเซ็น', () => {
  it('signs my line and sends the head\'s in one go, saying so on the button', async () => {
    show()
    expect(screen.getByRole('checkbox', { name: /ใส่ลายเซ็นของฉัน/ })).toBeChecked()
    expect(screen.getByRole('button', { name: /เซ็นเอกสาร/ })).toBeEnabled()
    pickHead()
    fireEvent.click(screen.getByRole('button', { name: /เซ็นและส่งให้ 1 คน/ }))
    await waitFor(() => expect(signDocument).toHaveBeenCalledWith('s1', 'maker'))
    expect(vi.mocked(assignSigners).mock.calls[0][1].map(a => [a.blockId, a.assignedUid])).toEqual([['maker', 'u1'], ['checker', 'boss']])
    expect(vi.mocked(assignSigners).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(signDocument).mock.invocationCallOrder[0])
  })

  it('signs my line afterwards, on a document saved without it', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: /เซ็นเอกสาร/ }))
    await waitFor(() => expect(signDocument).toHaveBeenCalledWith('s1', 'maker'))
  })

  it('sends only, leaving my line for pen, when switched off', async () => {
    show()
    fireEvent.click(screen.getByRole('checkbox', { name: /ใส่ลายเซ็นของฉัน/ }))
    pickHead()
    fireEvent.click(screen.getByRole('button', { name: /ส่งให้ 1 คนเซ็น/ }))
    await waitFor(() => expect(assignSigners).toHaveBeenCalled())
    expect(vi.mocked(assignSigners).mock.calls[0][1].map(a => a.blockId)).toEqual(['checker'])
    expect(signDocument).not.toHaveBeenCalled()
  })

  it('shows my signature as signed, and takes it off when switched off', async () => {
    show([mine('signed')])
    expect(screen.getByText('เซ็นแล้ว')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /บันทึก/ })).toBeDisabled()
    expect(screen.getByText('ยังไม่มีอะไรเปลี่ยน')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /ใส่ลายเซ็นของฉัน/ }))
    fireEvent.click(screen.getByRole('button', { name: /เอาลายเซ็นออก/ }))
    await waitFor(() => expect(unsignDocument).toHaveBeenCalledWith('s1', 'maker'))
    expect(vi.mocked(assignSigners).mock.calls[0][1]).toEqual([])
  })

  it('marks an unpicked line for pen, and remembers who was picked for next time', async () => {
    const first = show([mine('signed')])
    expect(screen.getByText('เซ็นบนกระดาษ')).toBeInTheDocument()
    pickHead()
    expect(screen.getByText('จะส่งให้เซ็น')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ส่งให้ 1 คนเซ็น/ }))
    await waitFor(() => expect(assignSigners).toHaveBeenCalled())
    first.unmount()
    show()
    expect(screen.getByRole('textbox', { name: 'ผู้เซ็นช่อง ผู้ตรวจสอบ' })).toHaveValue('ไกรธัช จิระกรธนัน')
  })

  it('offers to upload a signature when there is none, and can still send', async () => {
    show([], null)
    expect(screen.getByRole('link', { name: /อัปโหลดลายเซ็น/ })).toHaveAttribute('href', '/profile')
    pickHead()
    fireEvent.click(screen.getByRole('button', { name: /ส่งให้ 1 คนเซ็น/ }))
    await waitFor(() => expect(assignSigners).toHaveBeenCalled())
    expect(signDocument).not.toHaveBeenCalled()
  })
})
