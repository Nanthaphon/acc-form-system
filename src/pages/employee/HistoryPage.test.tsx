import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from './HistoryPage'
import { voidingAvailable } from '../../data/submissions'
import type { DocSignature, SubmissionSummary } from '../../types/schema'

vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { uid: 'u1', firstName: 'ธนัตถ์', lastName: 'นัยพินิจ', role: 'employee' } }) }))
vi.mock('../../data/versions', () => ({ getVersionCounts: vi.fn(() => Promise.resolve({})), editLabel: () => '' }))
vi.mock('../../data/formSettings', () => ({ listForms: vi.fn(() => Promise.resolve([{ formType: 'expense', name: 'ใบเบิก', signatureBlocks: [{ id: 'maker', label: 'ผู้เบิก' }, { id: 'checker', label: 'ผู้ตรวจสอบ' }] }])) }))
vi.mock('../../data/formGroups', () => ({ listGroups: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../components/dialog/dialogService', () => ({ uiAlert: vi.fn(), uiConfirm: vi.fn(), uiPrompt: vi.fn() }))

const doc = (id: string, docNumber: string, more: Partial<SubmissionSummary>): SubmissionSummary => ({
  id, docNumber, formType: 'expense', createdBy: 'u1', createdByEmployeeId: '1',
  header: { subject: '', categories: [], companyId: '', firstName: '', lastName: '', position: '', job: '' },
  totals: { columnTotals: {}, grandTotal: 100, amountInThaiText: '' },
  createdAt: 1, updatedAt: 1, printCount: 0, lastPrintedAt: null, ...more,
})
const bossSigned: DocSignature = { blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'boss', assignedName: 'หัวหน้า', status: 'signed' }
const rows = [
  doc('a', 'EX-0001', { signatures: [bossSigned], voided: { at: 1, byUid: 'u1', byName: 'ธนัตถ์', reason: 'กรอกยอดผิด', replacedById: 'b', replacedByNumber: 'EX-0002' } }),
  doc('b', 'EX-0002', { replaces: { id: 'a', docNumber: 'EX-0001' } }),
  doc('c', 'EX-0003', { signatures: [bossSigned] }),
]
vi.mock('../../data/submissions', async importOriginal => ({
  ...await importOriginal<object>(),
  listMySubmissions: vi.fn(() => Promise.resolve(rows)),
  listSigners: vi.fn(() => Promise.resolve([])),
  voidingAvailable: vi.fn(() => true),
}))

const rowOf = async (docNumber: string) => (await screen.findByText(docNumber)).closest('tr') as HTMLElement
const show = () => render(<MemoryRouter><HistoryPage /></MemoryRouter>)

describe('HistoryPage — cancelled and corrected documents', () => {
  // The cancelled copy is folded into the document that replaced it, so the
  // list shows one line per claim rather than the wrong one beside the right one.
  it('folds the cancelled copy under its correction', async () => {
    show()
    expect(await screen.findByText('EX-0002')).toBeInTheDocument()
    expect(screen.queryByText('EX-0001')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /ดูฉบับก่อนหน้า/ }))
    const old = await rowOf('EX-0001')
    expect(within(old).getByText(/กรอกยอดผิด/)).toBeInTheDocument()
    expect(within(old).getByRole('link', { name: /ดูเอกสารฉบับ EX-0001/ })).toHaveAttribute('href', '/submission/a/preview')
    expect(within(await rowOf('EX-0002')).getByText('แทน EX-0001')).toBeInTheDocument()
  })

  it('offers nothing but looking at a cancelled copy', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: /ดูฉบับก่อนหน้า/ }))
    const old = await rowOf('EX-0001')
    expect(within(old).queryByRole('link', { name: /แก้ไข/ })).toBeNull()
    expect(within(old).queryByRole('button', { name: /ลบเอกสาร|ยกเลิกเอกสาร/ })).toBeNull()
    expect(within(old).getByRole('link', { name: /ดูเอกสารฉบับ/ })).toBeInTheDocument()
  })

  // Signed by someone else, it cannot change: แก้ไข makes the corrected copy.
  it('corrects a document others have signed as a new one, and can cancel it', async () => {
    show()
    const signed = await rowOf('EX-0003')
    expect(within(signed).getByRole('link', { name: /แก้ไขเป็นฉบับใหม่/ })).toHaveAttribute('href', '/form/expense?revise=c')
    expect(within(signed).getByRole('button', { name: /ยกเลิกเอกสาร/ })).toBeInTheDocument()
    expect(within(signed).queryByRole('button', { name: /ลบเอกสาร/ })).toBeNull()
  })

  // Before the database is ready, a correction would be saved and the original
  // left standing beside it — the very mess this is meant to end.
  it('offers neither until cancelling is set up in the database', async () => {
    vi.mocked(voidingAvailable).mockReturnValue(false)
    show()
    const signed = await rowOf('EX-0003')
    expect(within(signed).queryByRole('link', { name: /แก้ไข/ })).toBeNull()
    expect(within(signed).queryByRole('button', { name: /ยกเลิกเอกสาร/ })).toBeNull()
    vi.mocked(voidingAvailable).mockReturnValue(true)
  })
})

describe('HistoryPage — ยอดรวมในแถบตัวกรอง', () => {
  it('ไม่มีการ์ดสถานะ แสดงยอดรวมต่อท้ายจำนวนรายการ', async () => {
    show()
    expect(await screen.findByText('EX-0003')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /เซ็นครบ\s*\d/ })).toBeNull()
    expect(screen.getByText(/ยอดรวม/)).toBeInTheDocument()
  })
})
