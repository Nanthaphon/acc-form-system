import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { FormSettings } from '../../types/schema'

const settings = {
  formType: 'f1', name: 'ใบรับเงินคืน', title: 'ใบรับเงินคืน', groupId: 'default', subject: '', attention: '', formCode: 'X-1',
  categories: [], notes: [],
  columns: [
    { key: 'date', label: 'วันที่', type: 'date' as const, width: 38 },
    { key: 'detail', label: 'รายละเอียด', type: 'text' as const },
  ],
} as unknown as FormSettings

vi.mock('../../data/formSettings', () => ({
  getFormSettings: vi.fn(() => Promise.resolve(settings)),
  updateFormSettings: vi.fn(() => Promise.resolve([])),
}))
vi.mock('../../data/companies', () => ({ listCompanies: vi.fn(() => Promise.resolve([])), updateCompanyLogo: vi.fn() }))
vi.mock('../../data/accessGroups', () => ({ listAccessGroups: vi.fn(() => Promise.resolve([])) }))
const dialogs = vi.hoisted(() => ({ uiAlert: vi.fn(() => Promise.resolve(true)), uiConfirm: vi.fn(() => Promise.resolve(false)), uiPrompt: vi.fn() }))
vi.mock('../../components/dialog/dialogService', () => dialogs)

const { default: FormSettingsPage } = await import('./FormSettingsPage')

const show = () => {
  const router = createMemoryRouter([
    { path: '/', element: <FormSettingsPage /> },
    { path: '/elsewhere', element: <div>หน้าอื่น</div> },
  ])
  render(<RouterProvider router={router} />)
  return router
}
const nameBox = () => screen.getByDisplayValue('ใบรับเงินคืน')

beforeEach(() => vi.clearAllMocks())

describe('unsaved edits on the form settings page', () => {
  it('says nothing is waiting until something is changed, then says so beside บันทึก', async () => {
    show()
    await waitFor(() => expect(nameBox()).toBeInTheDocument())
    expect(screen.queryByText('ยังไม่บันทึก')).not.toBeInTheDocument()
    fireEvent.change(nameBox(), { target: { value: 'ใบรับเงินคืน (ใหม่)' } })
    expect(screen.getByText('ยังไม่บันทึก')).toBeInTheDocument()
  })

  it('saving clears it', async () => {
    show()
    await waitFor(() => expect(nameBox()).toBeInTheDocument())
    fireEvent.change(nameBox(), { target: { value: 'ใหม่' } })
    fireEvent.click(screen.getByRole('button', { name: /บันทึกฟอร์ม/ }))
    await waitFor(() => expect(screen.queryByText('ยังไม่บันทึก')).not.toBeInTheDocument())
  })

  it('leaving with edits asks first, and staying keeps the page', async () => {
    const router = show()
    await waitFor(() => expect(nameBox()).toBeInTheDocument())
    fireEvent.change(nameBox(), { target: { value: 'ใหม่' } })
    await act(() => router.navigate('/elsewhere'))
    await waitFor(() => expect(dialogs.uiConfirm).toHaveBeenCalled())
    expect(screen.queryByText('หน้าอื่น')).not.toBeInTheDocument()
  })

  it('leaving with nothing changed does not ask', async () => {
    const router = show()
    await waitFor(() => expect(nameBox()).toBeInTheDocument())
    await act(() => router.navigate('/elsewhere'))
    expect(await screen.findByText('หน้าอื่น')).toBeInTheDocument()
    expect(dialogs.uiConfirm).not.toHaveBeenCalled()
  })

  it('draws each column in the heading preview at its printed share', async () => {
    show()
    await waitFor(() => expect(nameBox()).toBeInTheDocument())
    const head = screen.getByText('รายละเอียด', { selector: 'th' }).closest('tr')!
    expect(head.textContent).toMatch(/วันที่\s*20%/)
    expect(head.textContent).toMatch(/รายละเอียด\s*\d+% อัตโนมัติ/)
  })
})
