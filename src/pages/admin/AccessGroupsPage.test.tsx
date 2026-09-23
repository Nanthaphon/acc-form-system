import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AccessGroupsPage from './AccessGroupsPage'

// A group made through this page gets a random id, and that id is what the
// employee-import file asks for — so it has to be readable somewhere.
const groups = [
  { id: 'dx', name: 'Design Experience', sortOrder: 0, createdAt: 0 },
  { id: '8f2b1c44-9d3e-4a71-b0c2-5e6a7d8f9012', name: 'ฝ่ายขาย', sortOrder: 1, createdAt: 0 },
]
vi.mock('../../data/accessGroups', () => ({
  listAccessGroups: vi.fn(() => Promise.resolve(groups)),
  createAccessGroup: vi.fn(),
  renameAccessGroup: vi.fn(),
  deleteAccessGroup: vi.fn(),
  accessGroupUsage: vi.fn(() => Promise.resolve({ employees: 0, forms: 0 })),
}))

const show = () => render(<MemoryRouter><AccessGroupsPage /></MemoryRouter>)

describe('AccessGroupsPage', () => {
  it('shows the code of every group, not just its name', async () => {
    show()
    await waitFor(() => expect(screen.getByText('Design Experience')).toBeInTheDocument())
    expect(screen.getByText('dx')).toBeInTheDocument()
    expect(screen.getByText('8f2b1c44-9d3e-4a71-b0c2-5e6a7d8f9012')).toBeInTheDocument()
  })

  it('says what the code is for, so it is not mistaken for noise', async () => {
    show()
    await waitFor(() => expect(screen.getByText('Design Experience')).toBeInTheDocument())
    expect(screen.getByText(/ใช้ในไฟล์นำเข้าพนักงาน/)).toBeInTheDocument()
  })

  it('offers to copy each code — a random one is not worth retyping', async () => {
    show()
    await waitFor(() => expect(screen.getByText('Design Experience')).toBeInTheDocument())
    expect(screen.getAllByRole('button', { name: 'คัดลอกรหัสกลุ่ม' })).toHaveLength(groups.length)
  })
})
