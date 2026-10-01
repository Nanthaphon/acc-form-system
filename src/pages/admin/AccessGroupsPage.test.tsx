import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AccessGroupsPage from './AccessGroupsPage'

// The id is internal: the import file takes a group NAME as well, so the page
// shows names only.
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
  it('lists the groups by name, and keeps their ids out of sight', async () => {
    show()
    await waitFor(() => expect(screen.getByText('Design Experience')).toBeInTheDocument())
    expect(screen.getByText('ฝ่ายขาย')).toBeInTheDocument()
    expect(screen.queryByText('8f2b1c44-9d3e-4a71-b0c2-5e6a7d8f9012')).not.toBeInTheDocument()
  })
})
