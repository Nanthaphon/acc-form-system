import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { taxBases, taxSummary, ROW_RET_KEY } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// ค่าประกันงาน is held back on the work, not on everything a document pays
// for: the contractor's lines carry it, the materials and the hotel do not.
// Lines are ticked, and the document's one rate applies to the ticked ones.

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols }
const base: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }
const items: ExpenseRow[] = [
  { detail: 'ค่าแรงติดตั้ง', amount: 6000, [ROW_RET_KEY]: 1 },
  { detail: 'ค่าวัสดุ', amount: 3000 },
  { detail: 'ค่าแรงรื้อถอน', amount: 1000, [ROW_RET_KEY]: 1 },
]
const byLine: ExpenseHeader = { ...base, retentionRate: 5, retentionScope: 'rows' }

describe('ค่าประกันงาน on chosen lines', () => {
  it('is held back on the ticked lines only', () => {
    const bases = taxBases(cols, items, { ret: 'rows' })
    expect(bases.ret).toBe(7000)
    expect(taxSummary(10000, false, 0, 5, bases).retentionAmount).toBe(350)   // 5% of 7,000
  })

  it('is held back on everything, as before, unless the document says otherwise', () => {
    expect(taxSummary(10000, false, 0, 5, taxBases(cols, items, {})).retentionAmount).toBe(500)
  })

  it('holds back nothing when no line is ticked', () => {
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

  it('gives every line a tick, and records it', () => {
    const { onItemsChange } = show(byLine)
    expect(screen.getByRole('checkbox', { name: 'ประกันงาน รายการที่ 1' })).toBeChecked()
    fireEvent.click(screen.getByRole('checkbox', { name: 'ประกันงาน รายการที่ 2' }))
    expect(onItemsChange.mock.calls[0][0][1][ROW_RET_KEY]).toBe(1)
  })

  it('says how many lines are picked, picks them all at once, and shows the amount in its row', () => {
    const { onItemsChange } = show(byLine)
    expect(within(row()).getByText(/ติ๊กในคอลัมน์ "ประกันงาน" ของตาราง · เลือกแล้ว 2 จาก 3 รายการ/)).toBeInTheDocument()
    expect(within(row()).getByText('−350.00')).toBeInTheDocument()
    fireEvent.click(within(row()).getByRole('button', { name: 'เลือกทั้งหมด' }))
    expect(onItemsChange.mock.calls[0][0].map((r: ExpenseRow) => r[ROW_RET_KEY])).toEqual([1, 1, 1])
  })

  it('warns while no line is picked', () => {
    show(byLine, [{ detail: 'a', amount: 1000 }])
    expect(within(row()).getByText(/ยังไม่ได้เลือกรายการ/)).toBeInTheDocument()
  })
})

describe('on the printed sheet', () => {
  it('says what it was held back from, and prints no tick column', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={byLine} items={items} docNumber="X" settings={settings} />)
    expect(within(container).getByText('หัก 5% ค่าประกันงาน (ฐาน 7,000.00 · 2 รายการ)')).toBeInTheDocument()
    expect([...container.querySelectorAll('thead th')].map(th => th.textContent)).toEqual(['ลำดับ', 'รายละเอียด', 'จำนวนเงิน'])
    expect(within(container).getByText('9,650.00')).toBeInTheDocument()
  })
})
