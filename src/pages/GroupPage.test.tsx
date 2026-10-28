import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormSettings } from '../types/schema'

const form = (formType: string, name: string): FormSettings => ({
  formType, name, title: name, subject: '', attention: '', formCode: name.toUpperCase(),
  categories: [], notes: [], columns: [], groupId: 'g1', active: true, updatedAt: 0, createdAt: 0,
})
const FORMS = [form('f1', 'alpha'), form('f2', 'beta')]

vi.mock('../data/formGroups', () => ({
  listGroups: () => Promise.resolve([{ id: 'g1', name: 'เบิกค่าใช้จ่าย', sortOrder: 0, createdAt: 0 }]),
  renameGroup: vi.fn(),
}))
vi.mock('../data/formSettings', () => ({
  listForms: () => Promise.resolve(FORMS),
  createForm: vi.fn(), duplicateForm: vi.fn(() => Promise.resolve('f9')), renameForm: vi.fn(), deleteForm: vi.fn(), setFormActive: vi.fn(),
}))
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { uid: 'u1', role: 'admin' } }) }))
vi.mock('../components/dialog/dialogService', () => ({ uiAlert: vi.fn(), uiConfirm: vi.fn(), uiPrompt: vi.fn() }))

const { default: GroupPage } = await import('./GroupPage')
const { duplicateForm } = await import('../data/formSettings')
const { uiPrompt } = await import('../components/dialog/dialogService')

const show = async () => {
  render(
    <MemoryRouter initialEntries={['/group/g1']}>
      <Routes><Route path="/group/:groupId" element={<GroupPage />} /><Route path="/form/:id/edit" element={<div>หน้าตั้งค่าฟอร์ม</div>} /></Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument())
}

describe('GroupPage view switch', () => {
  beforeEach(() => { localStorage.clear() })

  it('starts on cards and switches to a list, keeping every form', async () => {
    await show()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'มุมมองรายการ' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('beta')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'มุมมองการ์ด' }))
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('remembers the choice for next time', async () => {
    await show()
    fireEvent.click(screen.getByRole('button', { name: 'มุมมองรายการ' }))
    await waitFor(() => expect(localStorage.getItem('formListView')).toBe('list'))
  })

  it('still searches in list view', async () => {
    await show()
    fireEvent.click(screen.getByRole('button', { name: 'มุมมองรายการ' }))
    fireEvent.change(screen.getByPlaceholderText(/ค้นหา/), { target: { value: 'beta' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText('alpha')).not.toBeInTheDocument()
  })
})

describe('GroupPage duplicate', () => {
  it('copies a form under the name given, and opens the copy to be set up', async () => {
    vi.mocked(uiPrompt).mockResolvedValueOnce('alpha 2')
    await show()
    fireEvent.click(screen.getAllByRole('button', { name: 'ทำสำเนาฟอร์ม' })[0])
    await waitFor(() => expect(duplicateForm).toHaveBeenCalledWith(expect.objectContaining({ formType: 'f1' }), 'alpha 2'))
    expect(vi.mocked(uiPrompt).mock.calls[0][1]).toMatchObject({ defaultValue: 'alpha (สำเนา)' })
    expect(await screen.findByText('หน้าตั้งค่าฟอร์ม')).toBeInTheDocument()
  })
})
