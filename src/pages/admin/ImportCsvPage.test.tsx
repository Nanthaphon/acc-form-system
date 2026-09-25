import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ImportCsvPage from './ImportCsvPage'

vi.mock('../../data/companies', () => ({ listCompanies: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../data/users', () => ({ importEmployees: vi.fn() }))

const show = () => render(<MemoryRouter><ImportCsvPage /></MemoryRouter>)

describe('ImportCsvPage', () => {
  it('offers one file to download, the one that explains itself', () => {
    show()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/employees-template.xlsx')
    expect(links[0]).toHaveAttribute('download')
  })

  // A plain CSV template used to sit beside the Excel one and was the likelier
  // of the two to be clicked — while being the only one that cannot carry the
  // dropdowns or the help sheet that make the import understandable.
  it('no longer offers a bare CSV template', () => {
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

  it('says where the column explanations are, so the help sheet gets opened', () => {
    show()
    expect(screen.getByText(/คำอธิบาย/)).toBeInTheDocument()
  })
})
