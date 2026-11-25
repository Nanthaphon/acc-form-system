import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FieldOptionsPage from './FieldOptionsPage'
import type { FieldOption } from '../../data/fieldOptions'

vi.mock('../../lib/supabase', () => ({ supabase: {}, supabaseSecondary: {} }))

const options: FieldOption[] = [
  { id: '1', field: 'department', value: 'Payroll', sortOrder: 1, createdAt: 0 },
  { id: '2', field: 'department', value: 'Design Experience', sortOrder: 2, createdAt: 0 },
  { id: '3', field: 'department', value: 'บัญชี', sortOrder: 3, createdAt: 0 },
  { id: '4', field: 'position', value: 'เจ้าหน้าที่บัญชี', sortOrder: 1, createdAt: 0 },
]
const list = vi.fn(() => Promise.resolve(options))
const rename = vi.fn((_id: string, _v: string) => Promise.resolve())
const add = vi.fn((_f: string, _v: string) => Promise.resolve())

vi.mock('../../data/fieldOptions', async importOriginal => ({
  ...(await importOriginal<typeof import('../../data/fieldOptions')>()),
  listFieldOptions: () => list(),
  fieldUsage: () => Promise.resolve({
    department: new Map([['Payroll', 3], ['Design Experience', 14]]),
    position: new Map([['เจ้าหน้าที่บัญชี', 2]]),
  }),
  renameFieldOption: (id: string, v: string) => rename(id, v),
  addFieldOption: (f: string, v: string) => add(f, v),
}))

const show = async () => {
  render(<MemoryRouter><FieldOptionsPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByText('Payroll')).toBeInTheDocument())
}
const names = () => screen.getAllByTestId('option-value').map(el => el.textContent)

describe('FieldOptionsPage', () => {
  beforeEach(() => { list.mockImplementation(() => Promise.resolve(options)); rename.mockClear(); add.mockClear() })

  // One list at a time, full width: no card left half empty beside a long one,
  // and no scroll box inside the page.
  it('shows one field at a time, as tabs that carry their counts', async () => {
    await show()
    const tabs = screen.getAllByRole('tab').map(t => t.textContent)
    expect(tabs).toEqual(['แผนก3', 'ตำแหน่ง1'])
    expect(screen.getByRole('tab', { name: /แผนก/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('เจ้าหน้าที่บัญชี')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /ตำแหน่ง/ }))
    expect(screen.getByText('เจ้าหน้าที่บัญชี')).toBeInTheDocument()
    expect(screen.queryByText('Payroll')).not.toBeInTheDocument()
  })

  it('sorts by name, or by how many people use each', async () => {
    await show()
    // Thai order, as the ก–ฮ on the button says: Thai first, then Latin A–Z.
    expect(names()).toEqual(['บัญชี', 'Design Experience', 'Payroll'])
    fireEvent.click(screen.getByRole('radio', { name: 'ใช้มากสุด' }))
    expect(names()).toEqual(['Design Experience', 'Payroll', 'บัญชี'])   // 14, 3, 0
    fireEvent.click(screen.getByRole('radio', { name: 'ก–ฮ' }))
    expect(names()[0]).toBe('บัญชี')
  })

  it('searches the list it is showing', async () => {
    await show()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'pay' } })
    expect(names()).toEqual(['Payroll'])
  })

  it('says plainly when nobody uses a value', async () => {
    await show()
    const row = screen.getByText('บัญชี').closest('li')!
    expect(within(row).getByText('ยังไม่มีคนใช้')).toBeInTheDocument()
    expect(within(screen.getByText('Payroll').closest('li')!).getByText('3 คน')).toBeInTheDocument()
  })

  // Renaming happens where the value is, rather than in a box over the page.
  it('renames in place: Enter saves, and says who it will change', async () => {
    await show()
    const row = screen.getByText('Payroll').closest('li')!
    fireEvent.click(within(row).getByRole('button', { name: 'เปลี่ยนชื่อ' }))
    const box = screen.getByRole('textbox', { name: 'ชื่อใหม่ของ Payroll' })
    expect(screen.getByText(/พนักงาน 3 คนที่ใช้ค่านี้จะถูกเปลี่ยนตามไปด้วย/)).toBeInTheDocument()
    fireEvent.change(box, { target: { value: 'Payroll & Benefits' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(rename).toHaveBeenCalledWith('1', 'Payroll & Benefits'))
  })

  it('Esc leaves the name as it was', async () => {
    await show()
    fireEvent.click(within(screen.getByText('Payroll').closest('li')!).getByRole('button', { name: 'เปลี่ยนชื่อ' }))
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'ชื่อใหม่ของ Payroll' }), { key: 'Escape' })
    expect(screen.queryByRole('textbox', { name: 'ชื่อใหม่ของ Payroll' })).not.toBeInTheDocument()
    expect(rename).not.toHaveBeenCalled()
  })

  it('adds to the field it is showing, in place', async () => {
    await show()
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มแผนก' }))
    const box = screen.getByRole('textbox', { name: 'แผนกใหม่' })
    fireEvent.change(box, { target: { value: 'Marketing' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(add).toHaveBeenCalledWith('department', 'Marketing'))
  })

  it('refuses a value the list already has, whatever its case', async () => {
    await show()
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มแผนก' }))
    const box = screen.getByRole('textbox', { name: 'แผนกใหม่' })
    fireEvent.change(box, { target: { value: 'payroll' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(await screen.findByText('มี "Payroll" อยู่ในรายการแล้ว')).toBeInTheDocument()
    expect(add).not.toHaveBeenCalled()
  })

  it('tells the admin to run the SQL when the table is not there yet', async () => {
    list.mockImplementation(() => Promise.reject({ code: 'PGRST205' }))
    render(<MemoryRouter><FieldOptionsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText(/2026-09-25-field-options\.sql/)).toBeInTheDocument())
  })
})
