import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FieldOptionsPage from './FieldOptionsPage'
import type { FieldOption } from '../../data/fieldOptions'

vi.mock('../../lib/supabase', () => ({ supabase: {}, supabaseSecondary: {} }))

const options: FieldOption[] = [
  { id: '1', field: 'department', value: 'Payroll', sortOrder: 1, createdAt: 0 },
  { id: '2', field: 'department', value: 'บัญชี', sortOrder: 2, createdAt: 0 },
]
const list = vi.fn(() => Promise.resolve(options))
const usage = () => Promise.resolve({
  department: new Map([['Payroll', 3], ['Payrol', 1]]),
  position: new Map([['เจ้าหน้าที่บัญชี', 2]]),
})

vi.mock('../../data/fieldOptions', async importOriginal => ({
  ...(await importOriginal<typeof import('../../data/fieldOptions')>()),
  listFieldOptions: () => list(),
  fieldUsage: () => usage(),
}))

const show = () => render(<MemoryRouter><FieldOptionsPage /></MemoryRouter>)
const section = (title: string) => screen.getByRole('heading', { name: title }).closest('section')!

describe('FieldOptionsPage', () => {
  beforeEach(() => { list.mockImplementation(() => Promise.resolve(options)) })

  it('lists each field\'s values with how many employees use them', async () => {
    show()
    await waitFor(() => expect(screen.getByText('Payroll')).toBeInTheDocument())
    const dept = within(section('แผนก'))
    expect(dept.getByText('2 ตัวเลือก')).toBeInTheDocument()
    expect(dept.getByText('3 คน')).toBeInTheDocument()
    expect(dept.getByText('0 คน')).toBeInTheDocument() // บัญชี, listed but unused
  })

  it('says when a field has no values yet', async () => {
    show()
    await waitFor(() => expect(screen.getByText('Payroll')).toBeInTheDocument())
    const pos = within(section('ตำแหน่ง'))
    expect(pos.getByText('ยังไม่มีตัวเลือก')).toBeInTheDocument()
  })

  // Building the list from what people already typed is the quick way in —
  // and it is how a misspelling like "Payrol" gets noticed.
  it('offers the values already in use that the list does not have', async () => {
    show()
    await waitFor(() => expect(screen.getByText('Payroll')).toBeInTheDocument())
    expect(within(section('แผนก')).getByRole('button', { name: /Payrol \(1\)/ })).toBeInTheDocument()
    expect(within(section('ตำแหน่ง')).getByRole('button', { name: /เจ้าหน้าที่บัญชี \(2\)/ })).toBeInTheDocument()
  })

  it('tells the admin to run the SQL when the table is not there yet', async () => {
    list.mockImplementation(() => Promise.reject({ code: 'PGRST205' }))
    show()
    await waitFor(() => expect(screen.getByText(/2026-09-25-field-options\.sql/)).toBeInTheDocument())
  })
})
