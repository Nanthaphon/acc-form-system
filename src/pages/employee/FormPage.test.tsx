import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FormPage from './FormPage'
import { cancelSigning, createSubmission, getSubmission, incrementPrint, signBlockAsSelf, unsignDocument, updateSubmission, voidSubmission } from '../../data/submissions'
import { copyAttachmentsTo, saveAttachmentList } from '../../data/attachments'
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
  copyAttachmentsTo: vi.fn((id: string, list: { path: string }[]) => Promise.resolve(list.map(a => ({ ...a, path: a.path.replace(/^[^/]+/, id) })))),
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
  voidSubmission: vi.fn(() => Promise.resolve()),
}))
const uiAlert = vi.fn((..._args: unknown[]) => Promise.resolve(true))
vi.mock('../../components/dialog/dialogService', () => ({
  uiAlert: (...args: unknown[]) => uiAlert(...args),
  uiConfirm: vi.fn(() => Promise.resolve(true)),
  uiPrompt: (...args: unknown[]) => uiPrompt(...args),
}))
const uiPrompt = vi.fn((..._args: unknown[]) => Promise.resolve<string | null>('กรอกยอดผิด'))

const print = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  window.print = print
  profile = baseProfile
  localStorage.clear()
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
  })

  // Typing into a document that cannot be saved, only to lose it, was the bug:
  // someone else's signature shuts every box.
  it('shuts every box on a document someone else has signed', async () => {
    openSaved({ createdBy: 'u1', signatures: [{ blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'boss', assignedName: 'หัวหน้า', status: 'signed', signedAt: 1 }] })
    expect(await screen.findByText(/มีคนเซ็นแล้ว จึงแก้ไขเนื้อหาไม่ได้/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByDisplayValue('ค่าเดินทาง')).toBeDisabled())
    expect(screen.getByRole('button', { name: /เพิ่มรายการ/ })).toBeDisabled()
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

  it('shows it on the sheet before saving, and takes it off the sheet when unticked', async () => {
    withSignature()
    openNew()
    const toggle = await screen.findByRole('checkbox', { name: /ใส่ลายเซ็นของฉันในช่อง/ })
    expect(screen.getByAltText('ลายเซ็น')).toHaveAttribute('src', 'data:image/png;base64,AAAA')
    expect(screen.getAllByText(/\(ธนัตถ์ นัยพินิจ\)/).length).toBeGreaterThan(0)
    fireEvent.click(toggle)
    expect(screen.queryByAltText('ลายเซ็น')).not.toBeInTheDocument()
  })

  it('never shows it on a sheet that can only be printed', async () => {
    withSignature()
    openSaved({ createdBy: 'u1', signatures: [{ blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'boss', assignedName: 'หัวหน้า', status: 'signed', signedAt: 1, signatureImage: 'data:boss' }] })
    await screen.findByRole('button', { name: /พิมพ์/ })
    expect(screen.getAllByAltText('ลายเซ็น').map(i => i.getAttribute('src'))).toEqual(['data:boss'])
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
    expect(await screen.findByText('ยังไม่มีลายเซ็นในระบบ')).toBeInTheDocument()
    expect(screen.getByLabelText('เลือกไฟล์ลายเซ็น')).toHaveAttribute('type', 'file')
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

  // The reported bug: a document saved with the requester's signature was
  // locked, yet its boxes could be typed in; "บันทึก" then only printed, and
  // the changes were gone.
  describe('a document signed by its requester alone', () => {
    const ownSig = () => ({ blockId: requester.id, blockLabel: requester.label, assignedUid: 'u1', assignedName: 'ธนัตถ์ นัยพินิจ', status: 'signed' as const, signedAt: 1 })

    it('saves a change: the signature comes off, the change is saved, the signature goes back on', async () => {
      withSignature()
      openSaved({ createdBy: 'u1', signatures: [ownSig()] })
      const detail = await screen.findByDisplayValue('ค่าเดินทาง')
      // as the database does: once the signature is off, the document carries none
      vi.mocked(cancelSigning).mockImplementationOnce(async () => {
        const doc = await vi.mocked(getSubmission)('s1')
        vi.mocked(getSubmission).mockResolvedValue({ ...doc!, signatures: [] })
      })
      expect(detail).not.toBeDisabled()
      expect(screen.queryByText(/แก้ไขเนื้อหาไม่ได้/)).not.toBeInTheDocument()
      fireEvent.change(detail, { target: { value: 'ค่าเดินทาง (แก้)' } })
      fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
      await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
      expect(cancelSigning).toHaveBeenCalledWith('s1')
      expect(vi.mocked(updateSubmission).mock.calls[0][1].items[0].detail).toBe('ค่าเดินทาง (แก้)')
      expect(signBlockAsSelf).toHaveBeenCalled()
      const order = [cancelSigning, updateSubmission, signBlockAsSelf].map(f => vi.mocked(f).mock.invocationCallOrder[0])
      expect(order).toEqual([...order].sort((a, b) => a - b))
    })

    it('can still be changed after it was sent to an approver who has not signed yet — and stays with them', async () => {
      withSignature()
      const pending = { blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'boss', assignedName: 'หัวหน้า', status: 'pending' as const }
      openSaved({ createdBy: 'u1', signatures: [ownSig(), pending] })
      const detail = await screen.findByDisplayValue('ค่าเดินทาง')
      expect(detail).not.toBeDisabled()
      fireEvent.change(detail, { target: { value: 'ค่าเดินทาง (แก้)' } })
      fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
      await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
      // only the requester's own signature comes off: the approver is still asked to sign
      expect(unsignDocument).toHaveBeenCalledWith('s1', requester.id)
      expect(cancelSigning).not.toHaveBeenCalled()
      expect(updateSubmission).toHaveBeenCalled()
    })

    it('prints it as it is when nothing was changed', async () => {
      withSignature()
      openSaved({ createdBy: 'u1', signatures: [ownSig()] })
      await screen.findByDisplayValue('ค่าเดินทาง')
      fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
      await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
      expect(cancelSigning).not.toHaveBeenCalled()
      expect(updateSubmission).not.toHaveBeenCalled()
    })

    it('takes the signature off for good when switched off', async () => {
      withSignature()
      openSaved({ createdBy: 'u1', signatures: [ownSig()] })
      await screen.findByDisplayValue('ค่าเดินทาง')
      fireEvent.click(screen.getByRole('checkbox', { name: /ใส่ลายเซ็นของฉันในช่อง/ }))
      fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
      await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
      expect(cancelSigning).toHaveBeenCalledWith('s1')
      expect(signBlockAsSelf).not.toHaveBeenCalled()
    })
  })
})

// What is typed is kept in this browser, so leaving for another menu does not
// lose it: coming back to the form puts it back.
describe('a draft of what was typed', () => {
  const draftKey = 'formDraft:v1:u1:new:expense'

  it('is kept as it is typed, and put back on coming back to the form', async () => {
    const first = openNew()
    await fillAmount()
    await waitFor(() => expect(localStorage.getItem(draftKey)).toContain('500'))
    expect(screen.getByText(/เก็บดราฟแล้ว/)).toBeInTheDocument()
    first.unmount()                                // off to another menu
    openNew()
    expect(await screen.findByText(/กู้คืนข้อมูลที่กรอกค้างไว้/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0')).toHaveValue(500)
  })

  it('keeps nothing for a form left as it opened', async () => {
    openNew()
    await screen.findByPlaceholderText('0')
    expect(localStorage.getItem(draftKey)).toBeNull()
  })

  it('is gone once the document is saved, and does not follow it as a draft of a new one', async () => {
    const first = openNew()
    await fillAmount()
    await waitFor(() => expect(localStorage.getItem(draftKey)).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(print).toHaveBeenCalled())
    expect(localStorage.getItem(draftKey)).toBeNull()
    expect(localStorage.getItem('formDraft:v1:u1:doc:new1')).toBeNull()
    first.unmount()
    openNew()
    await screen.findByPlaceholderText('0')
    expect(screen.queryByText(/กู้คืนข้อมูลที่กรอกค้างไว้/)).not.toBeInTheDocument()
  })

  it('can be thrown away, back to the empty form', async () => {
    const first = openNew()
    await fillAmount()
    await waitFor(() => expect(localStorage.getItem(draftKey)).not.toBeNull())
    first.unmount()
    openNew()
    fireEvent.click(await screen.findByRole('button', { name: 'ทิ้งดราฟ' }))
    expect(screen.getByPlaceholderText('0')).toHaveValue(null)
    expect(localStorage.getItem(draftKey)).toBeNull()
  })

  it('of a saved document is put back only if it is newer than the document', async () => {
    const draft = (savedAt: number) => localStorage.setItem('formDraft:v1:u1:doc:s1', JSON.stringify({
      header: { subject: '', categories: [], companyId: 'globe', firstName: 'ธนัตถ์', lastName: 'นัยพินิจ', position: 'HR', job: '' },
      items: [{ detail: 'ค่าเดินทาง (แก้ค้าง)', amount: 900 }], savedAt,
    }))
    draft(1000)   // older than the document's last save at 2000: someone saved over it since
    const first = openSaved({ updatedAt: 2000 } as Partial<Submission>)
    await screen.findByDisplayValue('ค่าเดินทาง')   // the document as saved
    expect(screen.queryByText(/กู้คืนข้อมูลที่กรอกค้างไว้/)).not.toBeInTheDocument()
    expect(localStorage.getItem('formDraft:v1:u1:doc:s1')).toBeNull()
    first.unmount()
    draft(3000)   // newer: put back
    openSaved({ updatedAt: 2000 } as Partial<Submission>)
    expect(await screen.findByText(/กู้คืนข้อมูลที่กรอกค้างไว้/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('ค่าเดินทาง (แก้ค้าง)')).toBeInTheDocument()
  })
})

// A signed document found wrong used to be copied and saved again, leaving the
// wrong one in the system beside the right one with nothing to tell them apart.
describe('correcting a document others have signed', () => {
  const signedByBoss = { blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'boss', assignedName: 'หัวหน้า', status: 'signed' as const, signedAt: 1 }
  const openRevise = () => {
    vi.mocked(getSubmission).mockImplementation(async (id: string) => (id === 's1' ? {
      id: 's1', docNumber: 'EX-0007', formType: 'expense', createdBy: 'u1',
      header: { subject: '', categories: [], companyId: 'globe', firstName: 'ธนัตถ์', lastName: 'นัยพินิจ', position: 'HR', job: '' },
      items: [{ detail: 'ค่าเดินทาง', amount: 500 }], totals: {}, signatures: [signedByBoss],
      attachments: [{ path: 's1/receipt.pdf', name: 'ใบเสร็จ.pdf', size: 10, type: 'application/pdf', uploadedAt: 1 }],
    } : { id, docNumber: 'EX-0008', signatures: [] }) as unknown as Submission)
    return render(
      <MemoryRouter initialEntries={['/form/expense?revise=s1']}>
        <Routes><Route path="/form/:formType" element={<FormPage />} /></Routes>
      </MemoryRouter>,
    )
  }

  it('makes a new document with the receipts, and cancels the original in its favour', async () => {
    vi.mocked(createSubmission).mockResolvedValueOnce({ id: 'new1', docNumber: 'EX-0008' } as Submission)
    openRevise()
    expect(await screen.findByText(/เป็นฉบับใหม่/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByDisplayValue('ค่าเดินทาง')).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(createSubmission).toHaveBeenCalledTimes(1)
    expect(updateSubmission).not.toHaveBeenCalled()
    expect(copyAttachmentsTo).toHaveBeenCalledWith('new1', [expect.objectContaining({ path: 's1/receipt.pdf' })])
    expect(saveAttachmentList).toHaveBeenCalledWith('new1', [expect.objectContaining({ path: 'new1/receipt.pdf' })])
    expect(voidSubmission).toHaveBeenCalledWith('s1', 'กรอกยอดผิด', 'new1')
  })

  it('saves nothing until a reason is given', async () => {
    uiPrompt.mockResolvedValueOnce(null)
    openRevise()
    await screen.findByText(/เป็นฉบับใหม่/)
    fireEvent.click(screen.getByRole('button', { name: /บันทึกและพิมพ์/ }))
    await waitFor(() => expect(uiPrompt).toHaveBeenCalled())
    expect(createSubmission).not.toHaveBeenCalled()
    expect(voidSubmission).not.toHaveBeenCalled()
  })

  it('a cancelled document is shut, says why, and can only be printed', async () => {
    openSaved({ createdBy: 'u1', voided: { at: 1, byUid: 'u1', byName: 'ธนัตถ์ นัยพินิจ', reason: 'กรอกยอดผิด', replacedById: 'n2', replacedByNumber: 'EX-0008' } })
    expect(await screen.findByText(/เอกสารนี้ถูกยกเลิกแล้ว — กรอกยอดผิด/)).toBeInTheDocument()
    expect(screen.getByText('EX-0008')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByDisplayValue('ค่าเดินทาง')).toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /พิมพ์ \/ บันทึก PDF/ }))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(updateSubmission).not.toHaveBeenCalled()
  })
})
