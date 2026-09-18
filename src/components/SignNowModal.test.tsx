import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignNowModal from './SignNowModal'
import type { FormSettings, SubmissionSummary, DocSignature } from '../types/schema'

vi.mock(import('../data/submissions'), async importOriginal => ({
  ...(await importOriginal()),
  signBlockAsSelf: vi.fn(),
  unsignDocument: vi.fn(),
}))

const me = { uid: 'uid-1', name: 'ผู้ดูแล ระบบ' }
const settings = {
  signatureBlocks: [{ id: 'maker', label: 'ผู้จัดทำเอกสาร' }, { id: 'checker', label: 'ผู้ตรวจสอบ' }],
} as FormSettings

function sub(signatures?: DocSignature[]): SubmissionSummary {
  return {
    id: 'sub-1', formType: 'f1', docNumber: 'GAC6709-008',
    header: { subject: '', categories: [], companyId: '', firstName: '', lastName: '', position: '', job: '' },
    totals: { columnTotals: {}, grandTotal: 0, amountInThaiText: '' },
    createdBy: 'uid-1', createdByEmployeeId: 'admin001',
    createdAt: 0, updatedAt: 0, printCount: 0, lastPrintedAt: null, signatures,
  }
}
const show = (s: SubmissionSummary, mySignature: string | null = 'data:image/png;base64,x') =>
  render(
    <MemoryRouter>
      <SignNowModal submission={s} settings={settings} me={me} mySignature={mySignature}
        onClose={() => {}} onDone={() => {}} />
    </MemoryRouter>,
  )

describe('SignNowModal', () => {
  it('offers a direct sign button on every open line — no signer to pick', () => {
    show(sub())
    expect(screen.getByText('ผู้จัดทำเอกสาร')).toBeInTheDocument()
    expect(screen.getByText('ผู้ตรวจสอบ')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /เซ็นตรงนี้/ })).toHaveLength(2)
    expect(screen.queryByPlaceholderText(/ค้นหาผู้เซ็น/)).not.toBeInTheDocument()
  })

  it('shows who signed a line instead of a sign button', () => {
    show(sub([{ blockId: 'maker', blockLabel: 'ผู้จัดทำเอกสาร', assignedUid: 'uid-1', assignedName: 'ผู้ดูแล ระบบ', status: 'signed' }]))
    expect(screen.getByText(/เซ็นแล้วโดย ผู้ดูแล ระบบ/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /เซ็นตรงนี้/ })).toHaveLength(1)
  })

  it('offers to take back a signature I put on the wrong line', () => {
    show(sub([{ blockId: 'maker', blockLabel: 'ผู้จัดทำเอกสาร', assignedUid: 'uid-1', assignedName: 'ผู้ดูแล ระบบ', status: 'signed' }]))
    expect(screen.getByRole('button', { name: /ลบลายเซ็น/ })).toBeInTheDocument()
  })

  it('lets the owner clear a signature someone else left', () => {
    // sub() is created by uid-1, who is also `me` — the owner.
    show(sub([{ blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'uid-9', assignedName: 'สมชาย ใจดี', status: 'signed' }]))
    expect(screen.getByRole('button', { name: /ลบลายเซ็น/ })).toBeInTheDocument()
  })

  it('offers nothing to remove while a line is still unsigned', () => {
    show(sub())
    expect(screen.queryByRole('button', { name: /ลบลายเซ็น/ })).not.toBeInTheDocument()
  })

  it('leaves a line that someone else was asked to sign alone', () => {
    show(sub([{ blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'uid-9', assignedName: 'สมชาย ใจดี', status: 'pending' }]))
    expect(screen.getByText(/รอ สมชาย ใจดี เซ็น/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /เซ็นตรงนี้/ })).toHaveLength(1)
  })

  it('still offers the line when it is already pending on me', () => {
    show(sub([{ blockId: 'maker', blockLabel: 'ผู้จัดทำเอกสาร', assignedUid: 'uid-1', assignedName: 'ผู้ดูแล ระบบ', status: 'pending' }]))
    expect(screen.getAllByRole('button', { name: /เซ็นตรงนี้/ })).toHaveLength(2)
  })

  it('asks for a saved signature first, and offers no sign button without one', () => {
    show(sub(), null)
    expect(screen.getByText(/ยังไม่ได้อัปโหลดลายเซ็น/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /เซ็นตรงนี้/ })).not.toBeInTheDocument()
  })
})
