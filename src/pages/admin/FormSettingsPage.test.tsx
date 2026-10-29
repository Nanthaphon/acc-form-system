import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FormSettingsPage from './FormSettingsPage'
import { getFormSettings, updateFormSettings } from '../../data/formSettings'
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
const uiAlert = vi.fn(() => Promise.resolve(true))
vi.mock('../../components/dialog/dialogService', () => ({
  uiAlert: (...args: unknown[]) => uiAlert(...(args as [])),
  uiConfirm: vi.fn(() => Promise.resolve(true)),
  uiPrompt: vi.fn(() => Promise.resolve('')),
}))

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
    expect(screen.getByText(/4 คอลัมน์ . แสดง 3.12/)).toBeInTheDocument() // the summary also carries the width budget
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

  // The ลำดับ tick was saved, the database had no column for it, and the page
  // still said "บันทึกฟอร์มแล้ว" — so the setting came back on, with no clue why.
  it('says plainly when the database could not store a setting', async () => {
    vi.mocked(updateFormSettings).mockResolvedValueOnce(['showSeq'])
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /บันทึกฟอร์ม/ }))
    await waitFor(() => expect(uiAlert).toHaveBeenCalled())
    const [message, opts] = uiAlert.mock.calls.at(-1) as unknown as [string, { tone?: string }]
    expect(message).toContain('คอลัมน์ลำดับ')
    expect(message).toContain('จะกลับไปเป็นค่าเดิม')
    expect(opts?.tone).not.toBe('success')
  })

  // Widths are set as a share of the table in whole percent — 100% is the whole
  // sheet — and kept in millimetres for the sheet itself (1% = 1.9mm).
  it('sets column widths in percent of the table', async () => {
    vi.mocked(updateFormSettings).mockResolvedValueOnce([])
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    const first = screen.getByLabelText('ความกว้างคอลัมน์ 1 (%)') as HTMLInputElement
    expect(first.value).toBe('21')                         // the 40mm it was saved at (21.05%), cut to whole percent
    fireEvent.change(first, { target: { value: '10.5' } })   // no decimals: 10.5 is taken as 10
    expect(first.value).toBe('10')
    fireEvent.change(first, { target: { value: '1a2' } })     // only digits are kept
    expect(first.value).toBe('12')
    fireEvent.change(first, { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: /บันทึกฟอร์ม/ }))
    await waitFor(() => expect(updateFormSettings).toHaveBeenCalled())
    const saved = vi.mocked(updateFormSettings).mock.calls[0][0] as FormSettings
    expect(saved.columns[0].width).toBeCloseTo(38, 6)
  })

  it('refuses a width that takes the table past 100%, in red, and keeps the last good one', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    const first = screen.getByLabelText('ความกว้างคอลัมน์ 1 (%)') as HTMLInputElement
    // ลำดับ 10mm (5.3%) is taken: 94.7% is left, and widths are whole percent
    fireEvent.change(first, { target: { value: '80' } })
    expect(first).not.toHaveAttribute('aria-invalid')
    fireEvent.change(first, { target: { value: '95' } })
    expect(first).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('ใส่ได้ไม่เกิน 94%')
    fireEvent.blur(first)
    expect(first.value).toBe('80')
    expect(first).not.toHaveAttribute('aria-invalid')
  })

  it('marks a form saved over 100% before the rule, lets it come down, and will not save it until it does', async () => {
    vi.mocked(getFormSettings).mockResolvedValueOnce({
      ...settings, showSeq: false,
      columns: [
        { key: 'date', label: 'วัน เดือน ปี', type: 'date' as const, width: 90 },
        { key: 'detail', label: 'รายละเอียด', type: 'text' as const, width: 180 },
        { key: 'amount', label: 'จำนวนเงิน', type: 'number' as const, width: 110 },
      ],
    } as unknown as FormSettings)
    show()
    await waitFor(() => expect(screen.getByText(/ความกว้างรวม 198% เกิน 100%/)).toBeInTheDocument())
    const detail = screen.getByLabelText('ความกว้างคอลัมน์ 2 (%)')
    expect(detail).toHaveAttribute('aria-invalid', 'true')
    fireEvent.click(screen.getByRole('button', { name: /บันทึกฟอร์ม/ }))
    expect(uiAlert).toHaveBeenCalledWith(expect.stringContaining('เกิน 100%'), expect.objectContaining({ title: 'บันทึกไม่ได้' }))
    expect(updateFormSettings).not.toHaveBeenCalled()
    // (saved as 47.4 + 94.7 + 57.9, opened as 47 + 94 + 57) coming down is taken even while still over…
    fireEvent.change(detail, { target: { value: '10' } })
    expect((detail as HTMLInputElement).value).toBe('10')
    expect(screen.getByText(/ความกว้างรวม 114% เกิน 100%/)).toBeInTheDocument()
    // …and once under 100% (47 + 10 + 30) nothing is red
    fireEvent.change(screen.getByLabelText('ความกว้างคอลัมน์ 3 (%)'), { target: { value: '30' } })
    expect(screen.queryByText(/เกิน 100%/)).not.toBeInTheDocument()
    expect(detail).not.toHaveAttribute('aria-invalid')
  })

  it('says what is left of the 100%, and what each column left blank will get', async () => {
    vi.mocked(getFormSettings).mockResolvedValueOnce({
      ...settings, showSeq: false,
      columns: [
        { key: 'date', label: 'วัน เดือน ปี', type: 'date' as const, width: 19 },     // 10%
        { key: 'detail', label: 'รายละเอียด', type: 'text' as const, width: 47.5 },  // 25%
        { key: 'job', label: 'Job', type: 'text' as const, width: 38 },              // 20%
        { key: 'amount', label: 'จำนวนเงิน', type: 'number' as const, width: 38 },   // 20%
        { key: 'note', label: 'หมายเหตุ', type: 'text' as const },
      ],
    } as unknown as FormSettings)
    show()
    await waitFor(() => expect(screen.getByText(/ใช้ไป 75%/)).toBeInTheDocument())
    expect(screen.getByText('เหลือ 25%')).toBeInTheDocument()
    expect(screen.getByText(/แบ่งให้คอลัมน์ที่เว้นว่าง 1 คอลัมน์/)).toBeInTheDocument()
    expect(screen.getByLabelText('ความกว้างคอลัมน์ 5 (%)')).toHaveAttribute('placeholder', 'อัตโนมัติ 25%')
    expect(screen.getByText(/กว้างรวม 75%\/100% · เหลือ 25%/)).toBeInTheDocument()
  })

  it('says how much of the 100% the widths take', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    expect(screen.getByText(/กว้างรวม [\d.]+%\/100%/)).toBeInTheDocument()
  })

  it('says it saved when everything was stored', async () => {
    vi.mocked(updateFormSettings).mockResolvedValueOnce([])
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /บันทึกฟอร์ม/ }))
    await waitFor(() => expect(uiAlert).toHaveBeenCalledWith('บันทึกฟอร์มแล้ว', expect.objectContaining({ tone: 'success' })))
  })

  it('lets a heading of two lines be read whole — the box grows with it', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    const heading = screen.getAllByPlaceholderText('ชื่อคอลัมน์')[0]
    expect(heading.tagName).toBe('TEXTAREA')
    expect(heading.className).toContain('resize-none')
    expect(heading.className).toContain('overflow-hidden')
    fireEvent.change(heading, { target: { value: 'ต้นทุน\nSupplier' } })
    expect((screen.getAllByPlaceholderText('ชื่อคอลัมน์')[0] as HTMLTextAreaElement).value).toBe('ต้นทุน\nSupplier')
  })

  it('names the column types in Thai only — no English jargon to decode', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    const types = screen.getAllByTitle('ชนิดข้อมูล')[0]
    expect([...types.querySelectorAll('option')].map(o => o.textContent))
      .toEqual(['ข้อความ', 'ตัวเลข', 'วันที่', 'ตัวเลือก', 'คำนวณ'])
  })

  // Writing this by hand means adding a column, switching its type and picking
  // two operands — the shape every one of these forms needs.
  it('builds a วันทำงาน × วันละ column in one click', async () => {
    vi.mocked(getFormSettings).mockResolvedValueOnce({
      ...settings,
      columns: [
        { key: 'days', label: 'วันทำงาน', type: 'number' },
        { key: 'rate', label: 'วันละ', type: 'number' },
      ],
    } as unknown as FormSettings)
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /คอลัมน์คูณ/ }))
    expect(screen.getByDisplayValue('วันทำงาน × วันละ')).toBeInTheDocument()
  })

  it('says why it cannot when there is only one numeric column', async () => {
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /คอลัมน์คูณ/ }))
    expect(screen.queryByDisplayValue(/×/)).not.toBeInTheDocument()
  })
})

// A column of ภาษีหัก ณ ที่จ่าย worked out from จำนวนเงินรวม at each line's rate.
describe('FormSettingsPage — withholding worked out in the table', () => {
  it('makes a column of withholding at the rate each line picks', async () => {
    vi.mocked(updateFormSettings).mockResolvedValueOnce([])
    show()
    await waitFor(() => expect(screen.getByText('คอลัมน์ตาราง')).toBeInTheDocument())
    fireEvent.change(screen.getAllByTitle('ชนิดข้อมูล')[3], { target: { value: 'calc' } })
    fireEvent.change(screen.getByDisplayValue('× คูณ'), { target: { value: 'whtRow' } })
    expect(screen.getByText(/อัตราที่ผู้กรอกเลือกในแต่ละรายการ/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('คอลัมน์ที่ใช้คิดหัก ณ ที่จ่าย'), { target: { value: 'amount' } })
    fireEvent.click(screen.getByRole('button', { name: /บันทึกฟอร์ม/ }))
    await waitFor(() => expect(updateFormSettings).toHaveBeenCalled())
    const saved = vi.mocked(updateFormSettings).mock.calls[0][0] as FormSettings
    expect(saved.columns[3].calc).toEqual({ op: 'whtRow', a: 'amount' })
  })
})
