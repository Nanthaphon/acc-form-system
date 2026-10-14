import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import { ROW_VAT_KEY } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn } from '../../types/schema'

// The tax options as one row per tax: its switch, its choices, and the amount
// it comes to, side by side — so a row says what was set and what it cost.

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const base: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }
const items: ExpenseRow[] = [
  { detail: 'a', amount: 1000, [ROW_VAT_KEY]: 1 },
  { detail: 'b', amount: 500 },
  { detail: 'c', amount: 500 },
]

const show = (header: ExpenseHeader, rows = items) => {
  const onHeaderChange = vi.fn(), onItemsChange = vi.fn()
  render(<ExpenseClaimForm header={header} items={rows} columns={cols} onHeaderChange={onHeaderChange} onItemsChange={onItemsChange} />)
  return { onHeaderChange, onItemsChange }
}
const row = (name: string) => screen.getByRole('switch', { name }).closest('[data-tax-row]') as HTMLElement

describe('the tax panel', () => {
  it('gives each tax a switch of its own, and says when one is off', () => {
    show(base)
    for (const name of ['ภาษีมูลค่าเพิ่ม 7%', 'หัก ณ ที่จ่าย', 'ค่าประกันงาน']) {
      expect(screen.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'false')
      expect(within(row(name)).getByText('ปิดอยู่')).toBeInTheDocument()
    }
  })

  it('switching a tax on records it', () => {
    const { onHeaderChange } = show(base)
    fireEvent.click(screen.getByRole('switch', { name: 'ภาษีมูลค่าเพิ่ม 7%' }))
    expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({ vat: true }))
    fireEvent.click(screen.getByRole('switch', { name: 'หัก ณ ที่จ่าย' }))
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ whtRate: 3 }))
  })

  // The amount sits in the row that produces it, not in a list further down.
  it('shows each tax\'s amount in its own row', () => {
    show({ ...base, vat: true, whtRate: 3, retentionRate: 5 })
    expect(within(row('ภาษีมูลค่าเพิ่ม 7%')).getByText('+140.00')).toBeInTheDocument()
    expect(within(row('หัก ณ ที่จ่าย')).getByText('−60.00')).toBeInTheDocument()
    expect(within(row('ค่าประกันงาน')).getByText('−100.00')).toBeInTheDocument()
    expect(screen.getByText('1,980.00 บาท')).toBeInTheDocument()
  })

  it('names the choice by what it means: the whole document, or some lines', () => {
    show({ ...base, vat: true })
    const scope = within(row('ภาษีมูลค่าเพิ่ม 7%')).getByRole('radiogroup', { name: 'ขอบเขต VAT' })
    expect(within(scope).getAllByRole('radio').map(r => r.textContent)).toEqual(['ทั้งเอกสาร', 'บางรายการ'])
  })

  it('says where to pick the lines, and how many are picked', () => {
    show({ ...base, vat: true, vatScope: 'rows' })
    expect(screen.getByText(/ติ๊กในคอลัมน์ "VAT 7%" ของตาราง · เลือกแล้ว 1 จาก 3 รายการ/)).toBeInTheDocument()
  })

  it('picks every line at once', () => {
    const { onItemsChange } = show({ ...base, vat: true, vatScope: 'rows' })
    fireEvent.click(screen.getByRole('button', { name: 'เลือกทั้งหมด' }))
    expect(onItemsChange.mock.calls[0][0].map((r: ExpenseRow) => r[ROW_VAT_KEY])).toEqual([1, 1, 1])
  })

  it('warns while no line is picked', () => {
    show({ ...base, vat: true, vatScope: 'rows' }, [{ detail: 'a', amount: 1000 }])
    expect(screen.getByText(/ยังไม่ได้เลือกรายการ/)).toBeInTheDocument()
  })

  it('offers the withholding rate as a list — the same rates the lines use', () => {
    const { onHeaderChange } = show({ ...base, whtRate: 3 })
    const rate = screen.getByRole('combobox', { name: 'อัตราหัก ณ ที่จ่าย' })
    expect(rate).toHaveValue('3')
    expect(within(rate).getAllByRole('option').map(o => o.textContent)).toEqual(['1%', '2%', '3%', '5%', 'อื่นๆ'])
    fireEvent.change(rate, { target: { value: '5' } })
    expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({ whtRate: 5 }))
  })

  it('lets the document take a rate that is not on the list', () => {
    const { onHeaderChange } = show({ ...base, whtRate: 3 })
    fireEvent.change(screen.getByRole('combobox', { name: 'อัตราหัก ณ ที่จ่าย' }), { target: { value: 'other' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'อัตราหัก ณ ที่จ่าย (%)' }), { target: { value: '1.5' } })
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ whtRate: 1.5 }))
  })

  it('points to the table for the rates when each line has its own', () => {
    show({ ...base, whtRate: 3, whtScope: 'rows' })
    expect(screen.queryByRole('combobox', { name: 'อัตราหัก ณ ที่จ่าย' })).not.toBeInTheDocument()
    expect(within(row('หัก ณ ที่จ่าย')).getByText('อัตราเลือกในตาราง')).toBeInTheDocument()
  })
})
