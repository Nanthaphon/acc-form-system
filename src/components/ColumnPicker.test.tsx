import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ColumnPicker from './ColumnPicker'

const columns = [
  { key: 'form', label: 'ชื่อฟอร์ม', locked: true },
  { key: 'emp', label: 'พนักงาน' },
  { key: 'amount', label: 'ยอด' },
]

function open(hidden: string[] = [], onToggle = vi.fn(), onReset = vi.fn()) {
  render(<ColumnPicker columns={columns} hidden={new Set(hidden)} onToggle={onToggle} onReset={onReset} />)
  fireEvent.click(screen.getByRole('button', { name: /คอลัมน์/ }))
  return { onToggle, onReset }
}

describe('ColumnPicker', () => {
  it('counts shown columns on the button, locked ones included', () => {
    render(<ColumnPicker columns={columns} hidden={new Set(['amount'])} onToggle={() => {}} onReset={() => {}} />)
    expect(screen.getByRole('button', { name: /คอลัมน์/ })).toHaveTextContent('2/3')
  })

  it('toggles a column and reports its key', () => {
    const { onToggle } = open()
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /พนักงาน/ }))
    expect(onToggle).toHaveBeenCalledWith('emp')
  })

  it('never lets a locked column be hidden', () => {
    const { onToggle } = open()
    const locked = screen.getByRole('menuitemcheckbox', { name: /ชื่อฟอร์ม/ })
    expect(locked).toBeDisabled()
    expect(locked).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(locked)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('shows every column again from the footer', () => {
    const { onReset } = open(['emp', 'amount'])
    fireEvent.click(screen.getByText('แสดงทั้งหมด'))
    expect(onReset).toHaveBeenCalled()
  })
})
