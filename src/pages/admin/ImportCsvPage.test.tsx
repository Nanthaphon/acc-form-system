import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ImportCsvPage from './ImportCsvPage'
import { importEmployees, updateEmployeeEmails } from '../../data/users'

vi.mock('../../data/companies', () => ({ listCompanies: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../data/accessGroups', () => ({ listAccessGroups: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../data/fieldOptions', () => ({
  loadOptionLists: vi.fn(() => Promise.resolve({ department: [], position: [] })),
}))
vi.mock('../../data/users', () => ({
  importEmployees: vi.fn(),
  existingEmployeeIds: vi.fn(() => Promise.resolve(new Set(['244530']))),
  updateEmployeeEmails: vi.fn(() => Promise.resolve({ updated: 1, failed: [] })),
  isRateLimited: vi.fn(() => false),
}))

vi.mock('../../components/dialog/dialogService', () => ({ uiAlert: vi.fn(), uiConfirm: vi.fn(() => Promise.resolve(true)) }))

const show = () => render(<MemoryRouter><ImportCsvPage /></MemoryRouter>)

describe('ImportCsvPage', () => {
  // The file is built on click from the live lists, not served from public/:
  // a fixed file cannot know the departments and groups this system has today.
  it('offers the template as a download built on request', () => {
    show()
    expect(screen.getByRole('button', { name: /ดาวน์โหลดไฟล์ Excel/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ดาวน์โหลด/ })).toBeNull()
  })

  // A plain CSV template used to sit beside the Excel one and was the likelier
  // of the two to be clicked — while being the only one that cannot carry the
  // dropdowns or the help sheet that make the import understandable.
  it('does not offer a bare CSV template', () => {
    show()
    expect(screen.queryByRole('button', { name: /CSV/ })).toBeNull()
  })

  it('takes the filled-in .xlsx as it is, with no conversion step', () => {
    const { container } = show()
    const input = container.querySelector('input[type=file]')
    expect(input).toHaveAttribute('accept', expect.stringContaining('.xlsx'))
    expect(screen.getByText(/รับไฟล์ \.xlsx และ \.csv/)).toBeInTheDocument()
    expect(screen.queryByText(/บันทึกเป็น CSV UTF-8/)).toBeNull()
  })

  it('says which columns are lists and which are free text', () => {
    show()
    expect(screen.getByText(/แผนกและตำแหน่งพิมพ์ได้อิสระ/)).toBeInTheDocument()
  })

  // Most people are in the system already; the file still carries their email.
  it('saves the email of someone who already has an account, creating nobody', async () => {
    const { container } = show()
    const csv = 'employeeId,firstName,lastName,companyId,email\n244530,หทัยรัตน์,ไวยขุนทด,globe,hathai@globe.co.th'
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File([csv], 'people.csv', { type: 'text/csv' })] } })
    fireEvent.click(await screen.findByRole('button', { name: /อัปเดตอีเมล 1 คน/ }))
    await waitFor(() => expect(updateEmployeeEmails).toHaveBeenCalledWith([expect.objectContaining({ employeeId: '244530', email: 'hathai@globe.co.th' })]))
    expect(importEmployees).not.toHaveBeenCalled()
  })
})
