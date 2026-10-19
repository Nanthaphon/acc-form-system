import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FormPage from './FormPage'
import { cancelSigning, createSubmission, getSubmission, incrementPrint, signBlockAsSelf, updateSubmission } from '../../data/submissions'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import type { Submission } from '../../types/schema'

// Saving and printing are one button. People printed a filled-in form and
// walked away, believing it was in the system — nothing had been saved, and
// the document was nowhere to be found afterwards.

const baseProfile = { uid: 'u1', employeeId: '1010154', firstName: 'ธนัตถ์', lastName: 'นัยพินิจ', position: 'HR', companyId: 'globe', role: 'employee' }
let profile: typeof baseProfile & { signatureImage?: string } = baseProfile
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ profile }) }))
const settings = { ...EXPENSE_CLAIM_DEFAULTS, columns: [
  { key: 'detail', label: 'รายละเอียด', type: 'text' as const },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number' as const, isTotal: true },
] }
vi.mock('../../data/formSettings', () => ({ getFormSettings: vi.fn(() => Promise.resolve(settings)) }))
vi.mock('../../data/companies', () => ({ getCompany: vi.fn(() => Promise.resolve(null)), listCompanies: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../data/attachments', async importOriginal => ({
  ...await importOriginal<object>(), uploadAttachments: vi.fn(), deleteAttachmentFiles: vi.fn(), saveAttachmentList: vi.fn(),
}))
vi.mock('../../components/VersionHistory', () => ({ default: () => null }))
vi.mock('../../data/submissions', async importOriginal => ({
  ...await importOriginal<object>(),
  createSubmission: vi.fn(() => Promise.resolve({ id: 'new1', docNumber: 'EX-0001' })),
  updateSubmission: vi.fn(() => Promise.resolve()),
  getSubmission: vi.fn(),
  incrementPrint: vi.fn(() => Promise.resolve()),
  signBlockAsSelf: vi.fn(() => Promise.resolve()),
  cancelSigning: vi.fn(() => Promise.resolve()),
  unsignDocument: vi.fn(() => Promise.resolve()),
}))
const uiAlert = vi.fn((..._args: unknown[]) => Promise.resolve(true))
vi.mock('../../components/dialog/dialogService', () => ({
  uiAlert: (...args: unknown[]) => uiAlert(...args),
  uiConfirm: vi.fn(() => Promise.resolve(true)),
}))

const print = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  window.print = print
  profile = baseProfile
})

const openNew = () => render(
  <MemoryRouter initialEntries={['/form/expense']}>
    <Routes><Route path="/form/:formType" element={<FormPage />} /></Routes>
  </MemoryRouter>,
)
const openSaved = (doc: Partial<Submission>) => {
  vi.mocked(getSubmission).mockResolvedValue({
    id: 's1', docNumber: 'EX-0007', formType: 'expense',
    header: { subject: '', categories: [], companyId: 'globe', firstName: 'ธนัตถ์', lastName: 'นัยพินิจ', position: 'HR', job: '' },
    items: [{ detail: 'ค่าเดินทาง', amount: 500 }], totals: {}, ...doc,
  } as Submission)
  return render(
    <MemoryRouter initialEntries={['/submission/s1']}>
      <Routes><Route path="/submission/:id" element={<FormPage />} /></Routes>
    </MemoryRouter>,
  )
}
const fillAmount = async () => {
  const amount = await screen.findByPlaceholderText('0')
  fireEvent.change(amount, { target: { value: '500' } })
}

describe('one button saves, then prints', () => {
  it('there is no print button that skips saving', async () => {
    openNew()
    await screen.findByRole('button', { name: /บันทึกและพิมพ์/ })
    expect(screen.queryByRole('button', { name: /^บันทึก$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /พิมพ์ \/ บันทึก PDF/ })).not.toBeInTheDocument()
  })

  it('a new document is saved first, then printed with the number it was given', async () => {
    openNew()
    await fillAmount()
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(createSubmission).toHaveBeenCalledTimes(1)
    expect(incrementPrint).toHaveBeenCalledWith('new1')
    // the sheet on paper carries the number, not "(ยังไม่บันทึก)"
    expect(screen.getAllByText(/EX-0001/).length).toBeGreaterThan(0)
    expect(vi.mocked(createSubmission).mock.invocationCallOrder[0]).toBeLessThan(print.mock.invocationCallOrder[0])
  })

  it('prints nothing when the document cannot be saved', async () => {
    openNew()
    await screen.findByRole('button', { name: /บันทึกและพิมพ์/ })
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))   // no amount yet
    await waitFor(() => expect(uiAlert).toHaveBeenCalled())
    expect(createSubmission).not.toHaveBeenCalled()
    expect(print).not.toHaveBeenCalled()
  })

  it('prints nothing when the save is refused', async () => {
    vi.mocked(createSubmission).mockRejectedValueOnce(new Error('network'))
    openNew()
    await fillAmount()
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(uiAlert).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'บันทึกไม่สำเร็จ' })))
    expect(print).not.toHaveBeenCalled()
  })

  it('a saved document is saved again — with whatever was changed — and printed', async () => {
    openSaved({})
    fireEvent.click(await screen.findByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(updateSubmission).toHaveBeenCalledWith('s1', expect.anything(), expect.anything())
    expect(incrementPrint).toHaveBeenCalledWith('s1')
  })

  it('a signed document cannot be changed, so the button only prints it', async () => {
    openSaved({ createdBy: 'u1', signatures: [{ blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'boss', assignedName: 'หัวหน้า', status: 'signed', signedAt: 1 }] })
    fireEvent.click(await screen.findByRole('button', { name: /พิมพ์/ }))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(updateSubmission).not.toHaveBeenCalled()
    // someone else signed it: no way round that from here
    expect(screen.queryByRole('button', { name: /แก้ไขเอกสาร/ })).not.toBeInTheDocument()
  })
})

// Most documents are signed by the requester in the system and by everyone
// else in pen, so the requester's own line is signed as the document is saved.
describe('the requester\'s own signature goes on as it is saved', () => {
  const withSignature = () => { profile = { ...baseProfile, signatureImage: 'data:image/png;base64,AAAA' } }
  const requester = EXPENSE_CLAIM_DEFAULTS.signatureBlocks?.[0] ?? { id: 'requester', label: 'ผู้จัดทำเอกสาร' }

  it('is offered, ticked, once a signature has been uploaded', async () => {
    withSignature()
    openNew()
    expect(await screen.findByRole('checkbox', { name: /ใส่ลายเซ็นของฉันในช่อง/ })).toBeChecked()
  })

  it('signs the requester line after saving and before printing', async () => {
    withSignature()
    vi.mocked(getSubmission).mockResolvedValue({ id: 'new1', signatures: [] } as unknown as Submission)
    openNew()
    await fillAmount()
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(signBlockAsSelf).toHaveBeenCalledWith(expect.objectContaining({ id: 'new1' }), expect.objectContaining({ id: requester.id }), { uid: 'u1', name: 'ธนัตถ์ นัยพินิจ' })
    expect(vi.mocked(signBlockAsSelf).mock.invocationCallOrder[0]).toBeLessThan(print.mock.invocationCallOrder[0])
  })

  it('leaves it off when unticked', async () => {
    withSignature()
    openNew()
    fireEvent.click(await screen.findByRole('checkbox', { name: /ใส่ลายเซ็นของฉันในช่อง/ }))
    await fillAmount()
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(signBlockAsSelf).not.toHaveBeenCalled()
  })

  it('says how to get it when no signature has been uploaded', async () => {
    openNew()
    expect(await screen.findByText(/ยังไม่ได้อัปโหลดลายเซ็น/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /ใส่ลายเซ็นของฉันในช่อง/ })).not.toBeInTheDocument()
  })

  it('prints nothing when the signature could not be put on', async () => {
    withSignature()
    vi.mocked(getSubmission).mockResolvedValue({ id: 'new1', signatures: [] } as unknown as Submission)
    vi.mocked(signBlockAsSelf).mockRejectedValueOnce(new Error('no signature uploaded'))
    openNew()
    await fillAmount()
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(uiAlert).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'ใส่ลายเซ็นไม่สำเร็จ' })))
    expect(print).not.toHaveBeenCalled()
  })

  it('a document signed only by its requester can be unlocked from the form to correct it', async () => {
    withSignature()
    openSaved({ createdBy: 'u1', signatures: [{ blockId: requester.id, blockLabel: requester.label, assignedUid: 'u1', assignedName: 'ธนัตถ์ นัยพินิจ', status: 'signed', signedAt: 1 }] })
    fireEvent.click(await screen.findByRole('button', { name: /แก้ไขเอกสาร/ }))
    await waitFor(() => expect(cancelSigning).toHaveBeenCalledWith('s1'))
  })
})
