import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrintHistoryPage from './PrintHistoryPage'
import { setDocStatus } from '../../data/submissions'
import type { DocSignature, SubmissionSummary } from '../../types/schema'

const doc = (id: string, docNumber: string, more: Partial<SubmissionSummary> = {}): SubmissionSummary => ({
  id, docNumber, formType: 'expense', createdBy: 'u1', createdByEmployeeId: '1010154',
  header: { subject: '', categories: [], companyId: '', firstName: '', lastName: '', position: '', job: '' },
  totals: { columnTotals: {}, grandTotal: 100, amountInThaiText: '' },
  createdAt: 1, updatedAt: 1, printCount: 0, lastPrintedAt: null, ...more,
} as SubmissionSummary)

const bossSigned: DocSignature = { blockId: 'checker', blockLabel: 'ผู้ตรวจสอบ', assignedUid: 'boss', assignedName: 'หัวหน้า', status: 'signed' }
// 0048 was signed, found wrong, and corrected: the correction carries its
// number plus the round (…-R1).
const rows = [
  doc('b', 'GAC-0048-R1', { replaces: { id: 'a', docNumber: 'GAC-0048' } }),
  doc('a', 'GAC-0048', { signatures: [bossSigned], voided: { at: 1, byUid: 'u1', byName: 'ธนัตถ์', reason: 'กรอกยอดผิด', replacedById: 'b', replacedByNumber: 'GAC-0048-R1' } }),
  doc('c', 'GAC-0049', { signatures: [bossSigned] }),
  doc('d', 'GAC-0050'),
]

vi.mock('../../data/submissions', async importOriginal => ({
  ...await importOriginal<object>(),
  listAllSubmissions: vi.fn(() => Promise.resolve(rows)),
  voidingAvailable: vi.fn(() => true),
  docStatusAvailable: vi.fn(() => true),
  setDocStatus: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../data/versions', async importOriginal => ({
  ...await importOriginal<object>(),
  getVersionCounts: vi.fn(() => Promise.resolve({})),
}))
vi.mock('../../data/users', () => ({ listEmployees: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../data/formSettings', () => ({ listForms: vi.fn(() => Promise.resolve([{ formType: 'expense', name: 'ใบเบิก' }])) }))
vi.mock('../../data/formGroups', () => ({ listGroups: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../data/fieldOptions', async importOriginal => ({
  ...await importOriginal<object>(),
  loadOptionLists: vi.fn(() => Promise.resolve({ department: [], position: [], docStatus: ['เอกสารผิด', 'ไม่ได้ใช้'] })),
}))
vi.mock('../../components/dialog/dialogService', () => ({ uiAlert: vi.fn(), uiConfirm: vi.fn(), uiPrompt: vi.fn() }))

const show = () => render(<MemoryRouter><PrintHistoryPage /></MemoryRouter>)
const rowOf = async (docNumber: string) => (await screen.findByText(docNumber)).closest('tr') as HTMLElement

beforeEach(() => { vi.mocked(setDocStatus).mockClear() })

describe('ประวัติทั้งหมด — เอกสารที่แก้ไขแล้ว', () => {
  it('แสดงฉบับล่าสุดบรรทัดเดียว พับฉบับก่อนหน้าไว้ข้างใน', async () => {
    show()
    expect(await screen.findByText('GAC-0048-R1')).toBeInTheDocument()
    expect(screen.queryByText('GAC-0048')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /ดูฉบับก่อนหน้า 1 ฉบับ/ }))
    const old = await rowOf('GAC-0048')
    expect(within(old).getByText(/กรอกยอดผิด/)).toBeInTheDocument()
    expect(within(old).getByRole('link', { name: /ดูเอกสารฉบับ GAC-0048/ })).toHaveAttribute('href', '/submission/a/preview')
  })

  it('เอกสารที่เซ็นครบแล้วยังแก้ได้ โดยออกเป็นฉบับแก้ไข', async () => {
    show()
    const signed = await rowOf('GAC-0049')
    expect(within(signed).getByRole('link', { name: /ฉบับแก้ไข/ })).toHaveAttribute('href', '/form/expense?revise=c')
  })

  it('เอกสารที่ยังไม่มีลายเซ็น แก้ในเอกสารเดิมเหมือนเดิม', async () => {
    show()
    const plain = await rowOf('GAC-0050')
    expect(within(plain).getByRole('link', { name: 'แก้ไขเอกสาร' })).toHaveAttribute('href', '/submission/d')
  })

  it('ปุ่มการจัดการเหลือแต่ไอคอน แต่ยังบอกได้ว่าปุ่มไหนคืออะไร', async () => {
    show()
    const plain = await rowOf('GAC-0050')
    const print = within(plain).getByRole('link', { name: 'ดูเอกสาร / สั่งพิมพ์' })
    expect(print).toHaveTextContent('')
  })
})

describe('ประวัติทั้งหมด — สถานะที่ผู้ดูแลระบบตั้งเอง', () => {
  it('เลือกสถานะจากรายการที่ตั้งไว้ใน Custom Field', async () => {
    show()
    const plain = await rowOf('GAC-0050')
    const picker = within(plain).getByRole('combobox', { name: /สถานะที่ผู้ดูแลระบบตั้ง/ })
    expect([...picker.querySelectorAll('option')].map(o => o.textContent))
      .toEqual(['— ไม่ได้ตั้ง —', 'เอกสารผิด', 'ไม่ได้ใช้'])

    fireEvent.change(picker, { target: { value: 'เอกสารผิด' } })
    await waitFor(() => expect(setDocStatus).toHaveBeenCalledWith('d', 'เอกสารผิด'))
  })

  it('ล้างสถานะได้', async () => {
    show()
    const plain = await rowOf('GAC-0050')
    const picker = within(plain).getByRole('combobox', { name: /สถานะที่ผู้ดูแลระบบตั้ง/ })
    fireEvent.change(picker, { target: { value: 'ไม่ได้ใช้' } })
    await waitFor(() => expect(setDocStatus).toHaveBeenCalled())
    fireEvent.change(picker, { target: { value: '' } })
    await waitFor(() => expect(setDocStatus).toHaveBeenLastCalledWith('d', null))
  })
})
