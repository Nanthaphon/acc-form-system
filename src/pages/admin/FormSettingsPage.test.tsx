import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FormSettingsPage from './FormSettingsPage'
import type { FormSettings } from '../../types/schema'

const settings = {
  formType: 'f1', name: 'ใบรับเงินคืนเข้าบริษัท', title: 'ใบรับเงินคืน', groupId: 'default',
  subject: '', attention: '', formCode: 'GAC6709-008',
  categories: [], notes: [],
  requesterTitle: 'ผู้รับเงิน', itemsTitle: 'รายการรับคืน',
  columns: [
    { key: 'date', label: 'วัน เดือน ปี', type: 'date' as const, width: 40 },
    { key: 'detail', label: 'รายละเอียดการรับ/คืนเงิน', type: 'text' as const },
    { key: 'amount', label: 'จำนวนเงิน', type: 'number' as const },
    { key: 'note', label: 'หมายเหตุ', type: 'text' as const, hidden: true },
  ],
  signatureBlocks: [{ id: 'maker', label: 'ผู้จัดทำเอกสาร' }, { id: 'checker', label: 'ผู้ตรวจสอบ' }],
} as unknown as FormSettings

vi.mock('../../data/formSettings', () => ({
  getFormSettings: vi.fn(() => Promise.resolve(settings)),
  updateFormSettings: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../../data/companies', () => ({
  listCompanies: vi.fn(() => Promise.resolve([])),
  updateCompanyLogo: vi.fn(),
}))
vi.mock('../../data/accessGroups', () => ({ listAccessGroups: vi.fn(() => Promise.resolve([])) }))

const show = () => render(<MemoryRouter><FormSettingsPage /></MemoryRouter>)
// Every section is a <details>; the one being edited is open, the rest are folded.
const sectionFor = (title: string) => screen.getByText(title).closest('details') as HTMLDetailsElement

beforeEach(() => vi.clearAllMocks())

describe('FormSettingsPage', () => {
  it('shows every setting as a foldable section', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    for (const t of ['ข้อมูลทั่วไป', 'หน้ากรอกของพนักงาน', 'คอลัมน์ตาราง', 'ข้อความในเอกสาร',
                     'ช่องลายเซ็น', 'หมวดค่าใช้จ่าย', 'หมายเหตุท้ายเอกสาร', 'โลโก้บริษัท']) {
      expect(sectionFor(t)).toBeInstanceOf(HTMLDetailsElement)
    }
  })

  it('opens only what you normally came to edit, and folds the rest away', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    expect(sectionFor('ข้อมูลทั่วไป').open).toBe(true)
    expect(sectionFor('คอลัมน์ตาราง').open).toBe(true)
    for (const t of ['หน้ากรอกของพนักงาน', 'ข้อความในเอกสาร', 'ช่องลายเซ็น',
                     'หมวดค่าใช้จ่าย', 'หมายเหตุท้ายเอกสาร', 'โลโก้บริษัท']) {
      expect(sectionFor(t).open).toBe(false)
    }
  })

  it('says on the folded card what is inside, so nothing has to be opened to check it', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    expect(screen.getByText('GAC6709-008 · เห็นได้: ทุกคน')).toBeInTheDocument()
    expect(screen.getByText('4 คอลัมน์ · แสดง 3/12')).toBeInTheDocument()
    expect(screen.getByText('ผู้รับเงิน · รายการรับคืน · ช่องเพิ่มเติม 0')).toBeInTheDocument()
    expect(screen.getByText('2 ช่อง · ผู้จัดทำเอกสาร, ผู้ตรวจสอบ')).toBeInTheDocument()
    expect(screen.getByText('ไม่มีข้อความ')).toBeInTheDocument()
    expect(screen.getAllByText('ไม่มี').length).toBeGreaterThan(0) // categories and notes
  })

  it('previews only the columns that will actually be printed', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    const preview = sectionFor('คอลัมน์ตาราง').querySelector('thead') as HTMLElement
    expect(preview.textContent).toContain('จำนวนเงิน')
    expect(preview.textContent).not.toContain('หมายเหตุ')   // hidden column
  })

  it('shows each column already set to its own type', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    const types = screen.getAllByTitle('ชนิดข้อมูล') as HTMLSelectElement[]
    expect(types.map(t => t.value)).toEqual(['date', 'text', 'number', 'text'])
  })

  it('names the column types in Thai only — no English jargon to decode', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    const types = screen.getAllByTitle('ชนิดข้อมูล')[0]
    expect([...types.querySelectorAll('option')].map(o => o.textContent))
      .toEqual(['ข้อความ', 'ตัวเลข', 'วันที่', 'ตัวเลือก', 'คำนวณ'])
  })
})
