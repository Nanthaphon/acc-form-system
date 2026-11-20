import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { SyncSummary } from '../data/employeeSync'

const syncEmployees = vi.fn()
vi.mock('../data/employeeSync', () => ({ syncEmployees: (...a: unknown[]) => syncEmployees(...a) }))
const { default: EmployeeSyncModal } = await import('./EmployeeSyncModal')

const summary = (o: Partial<SyncSummary> = {}): SyncSummary => ({
  dryRun: false, ranAt: 0, centralCount: 120,
  updated: [{ employeeId: '1010001', name: 'อ้อม ใจดี', changed: ['firstName', 'position'] }],
  unchanged: 30, notInCentral: [{ employeeId: 'ACC9', name: 'ทดสอบ ระบบ' }], notHere: [],
  resigned: [{ employeeId: '1010002', name: 'ก ข', resignDate: '2026-10-31' }],
  unknownCompanies: [], failed: [], ...o,
})

describe('EmployeeSyncModal', () => {
  beforeEach(() => syncEmployees.mockReset())

  it('previews without writing, then syncs and reloads the list', async () => {
    const onDone = vi.fn()
    syncEmployees.mockResolvedValueOnce(summary({ dryRun: true }))
    render(<EmployeeSyncModal onClose={() => {}} onDone={onDone} />)
    fireEvent.click(screen.getByRole('button', { name: 'ดูก่อนว่าจะเปลี่ยนอะไร' }))
    expect(await screen.findByText(/จะอัปเดต 1 คน/)).toBeInTheDocument()
    expect(syncEmployees).toHaveBeenLastCalledWith(true)
    expect(onDone).not.toHaveBeenCalled()

    syncEmployees.mockResolvedValueOnce(summary())
    fireEvent.click(screen.getByRole('button', { name: /ซิงก์เลย/ }))
    expect(await screen.findByText(/อัปเดตแล้ว 1 คน/)).toBeInTheDocument()
    expect(syncEmployees).toHaveBeenLastCalledWith(false)
    expect(onDone).toHaveBeenCalled()
    expect(screen.getByText(/ชื่อ, ตำแหน่ง/)).toBeInTheDocument()
    expect(screen.getByText(/ลาออกแล้วตามระบบกลาง/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เสร็จ' })).toBeInTheDocument()
  })

  it('shows why a sync could not run', async () => {
    syncEmployees.mockRejectedValueOnce(new Error('ยังไม่ได้ติดตั้ง Edge Function sync-employees'))
    render(<EmployeeSyncModal onClose={() => {}} onDone={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /ซิงก์เลย/ }))
    expect(await screen.findByText(/ยังไม่ได้ติดตั้ง/)).toBeInTheDocument()
  })
})
