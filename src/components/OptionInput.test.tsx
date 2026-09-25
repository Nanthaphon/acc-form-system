import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OptionInput from './OptionInput'

describe('OptionInput', () => {
  it('is a plain text box while the field has no list', () => {
    render(<OptionInput value="" options={[]} onChange={() => {}} placeholder="เช่น Payroll" />)
    expect(screen.getByPlaceholderText('เช่น Payroll').tagName).toBe('INPUT')
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('becomes a dropdown of the list once there is one', () => {
    render(<OptionInput value="" options={['Payroll', 'บัญชี']} onChange={() => {}} />)
    const choices = screen.getAllByRole('option').map(o => o.textContent)
    expect(choices).toEqual(['— เลือก —', 'Payroll', 'บัญชี'])
  })

  // An employee whose department was typed before the list existed must not
  // lose it the next time anyone saves their record.
  it('keeps a value that is not on the list, and says so', () => {
    render(<OptionInput value="Payrol" options={['Payroll']} onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('Payrol')
    expect(screen.getByRole('option', { name: 'Payrol (ไม่อยู่ในรายการ)' })).toBeInTheDocument()
  })

  it('reports the chosen value', () => {
    const onChange = vi.fn()
    render(<OptionInput value="" options={['Payroll', 'บัญชี']} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'บัญชี' } })
    expect(onChange).toHaveBeenCalledWith('บัญชี')
  })
})
