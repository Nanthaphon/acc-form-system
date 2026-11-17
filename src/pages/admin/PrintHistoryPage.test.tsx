import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrintHistoryPage from './PrintHistoryPage'
import { deleteSubmission, listAllSubmissions, setDocStatus } from '../../data/submissions'
import { uiConfirm } from '../../components/dialog/dialogService'
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
  deleteSubmission: vi.fn(() => Promise.resolve()),
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

describe('ประวัติทั้งหมด — แบ่งหน้าละ 10 รายการ', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => doc(`m${i + 1}`, `GAC-${String(i + 1).padStart(4, '0')}`))
  let data: SubmissionSummary[] = []
  const lines = () => screen.getAllByText(/^GAC-\d{4}$/).map(e => e.textContent)
  const pageBtn = (n: number) => screen.getByRole('button', { name: `หน้า ${n}` })

  beforeEach(() => {
    data = many(25)
    vi.mocked(listAllSubmissions).mockImplementation(() => Promise.resolve(data))
    vi.mocked(deleteSubmission).mockImplementation(async id => { data = data.filter(r => r.id !== id) })
    vi.mocked(uiConfirm).mockResolvedValue(true)
  })
  afterEach(() => { vi.mocked(listAllSubmissions).mockImplementation(() => Promise.resolve(rows)) })

  it('แสดง 10 รายการแรก พร้อมบอกว่าแสดงช่วงไหนจากทั้งหมด', async () => {
    show()
    await screen.findByText('GAC-0001')
    expect(lines()).toHaveLength(10)
    expect(screen.getByRole('navigation', { name: 'เลือกหน้า' })).toHaveTextContent('แสดง 1–10 จาก 25 รายการ')
    expect(pageBtn(1)).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /ก่อนหน้า/ })).toBeDisabled()
  })

  it('กดเลขหน้า / ถัดไป / ก่อนหน้า แล้วเปลี่ยนรายการ', async () => {
    show()
    await screen.findByText('GAC-0001')
    fireEvent.click(pageBtn(3))
    expect(lines()).toEqual(['GAC-0021', 'GAC-0022', 'GAC-0023', 'GAC-0024', 'GAC-0025'])
    expect(screen.getByText(/แสดง/).closest('p')).toHaveTextContent('แสดง 21–25 จาก 25 รายการ')
    expect(screen.getByRole('button', { name: /ถัดไป/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /ก่อนหน้า/ }))
    expect(lines()[0]).toBe('GAC-0011')
    fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }))
    expect(lines()[0]).toBe('GAC-0021')
  })

  it('ค้นหาแล้วกลับไปหน้า 1', async () => {
    show()
    await screen.findByText('GAC-0001')
    fireEvent.click(pageBtn(2))
    fireEvent.change(screen.getByPlaceholderText(/ค้นหา/), { target: { value: 'GAC-00' } })
    expect(pageBtn(1)).toHaveAttribute('aria-current', 'page')
    expect(lines()[0]).toBe('GAC-0001')
  })

  it('ลบเอกสารแล้วยังอยู่หน้าเดิม', async () => {
    show()
    await screen.findByText('GAC-0001')
    fireEvent.click(pageBtn(2))
    const row = (await screen.findByText('GAC-0012')).closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: /ตัวเลือกเพิ่มเติม/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /ลบเอกสาร/ }))
    await waitFor(() => expect(screen.queryByText('GAC-0012')).toBeNull())
    expect(pageBtn(2)).toHaveAttribute('aria-current', 'page')
    expect(lines()[0]).toBe('GAC-0011')
  })

  it('ลบรายการสุดท้ายของหน้าสุดท้าย แล้วถอยไปหน้าก่อน', async () => {
    data = many(21)
    show()
    await screen.findByText('GAC-0001')
    fireEvent.click(pageBtn(3))
    const row = (await screen.findByText('GAC-0021')).closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: /ตัวเลือกเพิ่มเติม/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /ลบเอกสาร/ }))
    await waitFor(() => expect(screen.queryByText('GAC-0021')).toBeNull())
    expect(lines()[0]).toBe('GAC-0011')
    expect(pageBtn(2)).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('button', { name: 'หน้า 3' })).toBeNull()
  })

  it('ไม่ถึง 10 รายการ ไม่มีตัวเลื่อนหน้า', async () => {
    data = many(4)
    show()
    await screen.findByText('GAC-0001')
    expect(screen.queryByRole('navigation', { name: 'เลือกหน้า' })).toBeNull()
  })
})
