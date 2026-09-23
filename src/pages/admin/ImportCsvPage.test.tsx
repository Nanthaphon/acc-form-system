import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ImportCsvPage from './ImportCsvPage'

vi.mock('../../data/companies', () => ({ listCompanies: vi.fn(() => Promise.resolve([])) }))
vi.mock('../../data/users', () => ({ importEmployees: vi.fn() }))

const show = () => render(<MemoryRouter><ImportCsvPage /></MemoryRouter>)

describe('ImportCsvPage', () => {
  it('offers the Excel file first — it is the one that explains the columns', () => {
    show()
    const xlsx = screen.getByRole('link', { name: /ดาวน์โหลดไฟล์ Excel/ })
    expect(xlsx).toHaveAttribute('href', '/employees-template.xlsx')
    expect(xlsx).toHaveAttribute('download')
  })

  it('keeps the plain CSV for anyone who does not want the spreadsheet', () => {
    show()
    expect(screen.getByRole('button', { name: /ไฟล์ CSV เปล่า/ })).toBeInTheDocument()
  })

  it('warns that the spreadsheet has to be saved as CSV — the importer reads only .csv', () => {
    show()
    expect(screen.getByText(/บันทึกเป็น CSV UTF-8/)).toBeInTheDocument()
  })
})
