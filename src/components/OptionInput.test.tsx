import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OptionInput from './OptionInput'

describe('OptionInput', () => {
  it('is a plain text box while the field has no list', () => {
    render(<OptionInput value="" options={[]} onChange={() => {}} placeholder="เช่น Payroll" />)
    const box = screen.getByPlaceholderText('เช่น Payroll')
    expect(box.tagName).toBe('INPUT')
    expect(box).not.toHaveAttribute('list')
  })

  it('suggests the list once there is one', () => {
    const { container } = render(<OptionInput value="" options={['Payroll', 'บัญชี']} onChange={() => {}} />)
    const box = screen.getByRole('combobox')
    const list = container.querySelector(`datalist#${CSS.escape(box.getAttribute('list')!)}`)
    expect([...list!.querySelectorAll('option')].map(o => o.value)).toEqual(['Payroll', 'บัญชี'])
  })

  // The list is a suggestion, not a rule: a department it does not have yet
  // must still be typeable, and must still be saved as typed.
  it('takes a value that is not on the list', () => {
    const onChange = vi.fn()
    render(<OptionInput value="" options={['Payroll']} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Operation Team 6 (Haier)' } })
    expect(onChange).toHaveBeenCalledWith('Operation Team 6 (Haier)')
  })

  it('shows a value already held, whether or not it is listed', () => {
    render(<OptionInput value="Payrol" options={['Payroll']} onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('Payrol')
  })
})
