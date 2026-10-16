import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { retLines, taxBases, taxSummary, ROW_RET_RATE_KEY } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// ค่าประกันงาน is held back on the work, not on everything a document pays
// for: the contractor's lines carry it, the materials and the hotel do not —
// and, like withholding, each line held back takes a rate of its own.

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols }
const base: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }
const items: ExpenseRow[] = [
  { detail: 'ค่าแรงติดตั้ง', amount: 6000, [ROW_RET_RATE_KEY]: 5 },
  { detail: 'ค่าวัสดุ', amount: 3000 },
  { detail: 'ค่าแรงรื้อถอน', amount: 1000, [ROW_RET_RATE_KEY]: 10 },
]
const byLine: ExpenseHeader = { ...base, retentionRate: 5, retentionScope: 'rows' }

describe('ค่าประกันงาน on chosen lines', () => {
  it('is held back on each line at its own rate', () => {
    const bases = taxBases(cols, items, { ret: 'rows' })
    expect(bases.ret).toBe(7000)
    expect(retLines(bases)).toEqual([
      { rate: 5, base: 6000, count: 1, amount: 300 },
      { rate: 10, base: 1000, count: 1, amount: 100 },
    ])
    expect(taxSummary(10000, false, 0, 5, bases).retentionAmount).toBe(400)
  })

  it('is held back on everything, as before, unless the document says otherwise', () => {
    expect(taxSummary(10000, false, 0, 5, taxBases(cols, items, {})).retentionAmount).toBe(500)
  })

  it('holds back nothing when no line has a rate', () => {
    const bases = taxBases(cols, [{ detail: 'a', amount: 1000 }], { ret: 'rows' })
    expect(taxSummary(1000, false, 0, 5, bases).retentionAmount).toBe(0)
  })
})

describe('on the fill-in screen', () => {
  const show = (header: ExpenseHeader, rows = items) => {
    const onHeaderChange = vi.fn(), onItemsChange = vi.fn()
    render(<ExpenseClaimForm header={header} items={rows} columns={cols} onHeaderChange={onHeaderChange} onItemsChange={onItemsChange} />)
    return { onHeaderChange, onItemsChange }
  }
  const row = () => screen.getByRole('switch', { name: 'ค่าประกันงาน' }).closest('[data-tax-row]') as HTMLElement

  it('offers ทั้งเอกสาร / บางรายการ once ค่าประกันงาน is on', () => {
    const { onHeaderChange } = show({ ...base, retentionRate: 5 })
    const scope = within(row()).getByRole('radiogroup', { name: 'ขอบเขตค่าประกันงาน' })
    expect(within(scope).getByRole('radio', { name: 'ทั้งเอกสาร' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(scope).getByRole('radio', { name: 'บางรายการ' }))
    expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({ retentionScope: 'rows' }))
  })

  it('gives every line a rate to choose, and records it', () => {
    const { onItemsChange } = show(byLine)
    expect(screen.getByRole('combobox', { name: 'ประกันงาน รายการที่ 1' })).toHaveValue('5')
    expect(screen.getByRole('combobox', { name: 'ประกันงาน รายการที่ 2' })).toHaveValue('0')
    fireEvent.change(screen.getByRole('combobox', { name: 'ประกันงาน รายการที่ 2' }), { target: { value: '10' } })
    expect(onItemsChange.mock.calls[0][0][1][ROW_RET_RATE_KEY]).toBe(10)
  })

  it('takes a rate typed under อื่นๆ', () => {
    const { onItemsChange } = show(byLine)
    fireEvent.change(screen.getByRole('combobox', { name: 'ประกันงาน รายการที่ 2' }), { target: { value: 'other' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'อัตราประกันงาน รายการที่ 2 (%)' }), { target: { value: '2.5' } })
    expect(onItemsChange.mock.calls.at(-1)![0][1][ROW_RET_RATE_KEY]).toBe(2.5)
  })

  it('shows each rate and what it comes to, in its row', () => {
    show(byLine)
    expect(within(row()).getByText('อัตราเลือกในตาราง')).toBeInTheDocument()
    expect(within(row()).getByText('ค่าประกันงาน 5% (จาก 6,000.00 · 1 รายการ)')).toBeInTheDocument()
    expect(within(row()).getByText('ค่าประกันงาน 10% (จาก 1,000.00 · 1 รายการ)')).toBeInTheDocument()
    expect(within(row()).getByText('−400.00')).toBeInTheDocument()
  })

  it('warns while no line has a rate', () => {
    show(byLine, [{ detail: 'a', amount: 1000 }])
    expect(within(row()).getByText(/ยังไม่ได้เลือกรายการ — เลือกอัตราในคอลัมน์ "ประกันงาน"/)).toBeInTheDocument()
  })
})

describe('on the printed sheet', () => {
  it('prints a line per rate, and no rate column', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={byLine} items={items} docNumber="X" settings={settings} />)
    expect(within(container).getByText('หัก 5% ค่าประกันงาน (ฐาน 6,000.00 · 1 รายการ)')).toBeInTheDocument()
    expect(within(container).getByText('หัก 10% ค่าประกันงาน (ฐาน 1,000.00 · 1 รายการ)')).toBeInTheDocument()
    expect([...container.querySelectorAll('thead th')].map(th => th.textContent)).toEqual(['ลำดับ', 'รายละเอียด', 'จำนวนเงิน'])
    expect(within(container).getByText('9,600.00')).toBeInTheDocument()
  })
})
