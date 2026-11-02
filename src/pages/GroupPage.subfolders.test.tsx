import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormGroup, FormSettings } from '../types/schema'

const form = (formType: string, name: string, groupId: string, active = true): FormSettings => ({
  formType, name, title: name, subject: '', attention: '', formCode: `F-${formType}`, categories: [], notes: [], columns: [],
  groupId, active, updatedAt: 0, createdAt: 0,
})
const state = vi.hoisted(() => ({
  groups: [] as FormGroup[],
  forms: [] as FormSettings[],
  role: 'admin' as 'admin' | 'employee',
}))
vi.mock('../data/formGroups', () => ({
  listGroups: () => Promise.resolve(state.groups),
  renameGroup: vi.fn(), createGroup: vi.fn(() => Promise.resolve('new')), deleteGroup: vi.fn(), setGroupActive: vi.fn(),
}))
vi.mock('../data/formSettings', () => ({
  listForms: () => Promise.resolve(state.forms),
  createForm: vi.fn(), duplicateForm: vi.fn(), renameForm: vi.fn(), deleteForm: vi.fn(), setFormActive: vi.fn(),
  moveForm: vi.fn(() => Promise.resolve()),
}))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { uid: 'u1', role: state.role } }) }))
vi.mock('../components/dialog/dialogService', () => ({ uiAlert: vi.fn(), uiConfirm: vi.fn(), uiPrompt: vi.fn() }))

const { default: GroupPage } = await import('./GroupPage')
const { createGroup, deleteGroup } = await import('../data/formGroups')
const { moveForm } = await import('../data/formSettings')
const { uiPrompt, uiAlert } = await import('../components/dialog/dialogService')

const show = (at: string) => render(
  <MemoryRouter initialEntries={[at]}>
    <Routes><Route path="/group/:groupId" element={<GroupPage />} /></Routes>
  </MemoryRouter>,
)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  state.role = 'admin'
  state.groups = [
    { id: 'main', name: 'เบิกค่าใช้จ่าย', sortOrder: 1, createdAt: 0, active: true, parentId: null },
    { id: 'cash', name: 'เงินสดย่อย', sortOrder: 2, createdAt: 0, active: true, parentId: 'main' },
  ]
  state.forms = [form('claim', 'ใบเบิก', 'main'), form('petty', 'ใบเบิกเงินสดย่อย', 'cash')]
})

describe('sub-folders', () => {
  it('a folder shows its sub-folders above its own forms', async () => {
    show('/group/main')
    const card = await screen.findByText('เงินสดย่อย')
    expect(card.closest('[role=button]')).toHaveTextContent('1 ฟอร์ม')
    expect(screen.getByText('ใบเบิก')).toBeInTheDocument()
    expect(screen.queryByText('ใบเบิกเงินสดย่อย')).not.toBeInTheDocument()
    expect(screen.getByText(/1 โฟลเดอร์ · 1 ฟอร์ม/)).toBeInTheDocument()
  })

  it('creates a sub-folder inside this folder', async () => {
    vi.mocked(uiPrompt).mockResolvedValueOnce('ค่าเดินทาง')
    show('/group/main')
    fireEvent.click(await screen.findByRole('button', { name: 'โฟลเดอร์ย่อย' }))
    await waitFor(() => expect(createGroup).toHaveBeenCalledWith('ค่าเดินทาง', 'main'))
  })

  it('goes one level only: no sub-folder inside a sub-folder', async () => {
    show('/group/cash')
    expect(await screen.findByText('ใบเบิกเงินสดย่อย')).toBeInTheDocument()
    expect(screen.getByText(/ใน เบิกค่าใช้จ่าย/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'โฟลเดอร์ย่อย' })).not.toBeInTheDocument()
  })

  it('offers no sub-folders before the database has the column', async () => {
    state.groups = [{ id: 'main', name: 'เบิกค่าใช้จ่าย', sortOrder: 1, createdAt: 0 }]
    show('/group/main')
    await screen.findByText('ใบเบิก')
    expect(screen.queryByRole('button', { name: 'โฟลเดอร์ย่อย' })).not.toBeInTheDocument()
  })

  it('will not delete a sub-folder that still holds forms', async () => {
    show('/group/main')
    await screen.findByText('เงินสดย่อย')
    fireEvent.click(screen.getByRole('button', { name: 'ลบโฟลเดอร์' }))
    expect(uiAlert).toHaveBeenCalled()
    expect(deleteGroup).not.toHaveBeenCalled()
  })

  it('moves a form into a sub-folder', async () => {
    show('/group/main')
    await screen.findByText('ใบเบิก')
    fireEvent.click(screen.getByRole('button', { name: 'ย้ายไปโฟลเดอร์อื่น' }))
    const dialog = screen.getByRole('dialog', { name: 'ย้ายฟอร์มไปโฟลเดอร์อื่น' })
    expect(within(dialog).getByText('อยู่ที่นี่').closest('label')).toHaveTextContent('เบิกค่าใช้จ่าย')
    fireEvent.click(within(dialog).getByLabelText(/เงินสดย่อย/))
    fireEvent.click(within(dialog).getByRole('button', { name: 'ย้าย' }))
    await waitFor(() => expect(moveForm).toHaveBeenCalledWith('claim', 'cash'))
  })

  it('employees do not see a sub-folder that is off, or one with nothing for them', async () => {
    state.role = 'employee'
    state.groups = [...state.groups, { id: 'empty', name: 'ว่าง', sortOrder: 3, createdAt: 0, active: true, parentId: 'main' }]
    state.groups[1] = { ...state.groups[1], active: false }
    show('/group/main')
    await screen.findByText('ใบเบิก')
    expect(screen.queryByText('เงินสดย่อย')).not.toBeInTheDocument()
    expect(screen.queryByText('ว่าง')).not.toBeInTheDocument()
  })
})
