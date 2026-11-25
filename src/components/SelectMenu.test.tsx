import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SelectMenu from './SelectMenu'

const BANKS = ['BBL', 'KBANK', 'KTB', 'SCB', 'BAY', 'TTB', 'UOB', 'CIMBT', 'KKP', 'TISCO']
const show = (value = '', onChange = vi.fn()) => {
  render(<SelectMenu ariaLabel="ธนาคาร" value={value} onChange={onChange}
    options={[{ value: '', label: 'เลือก' }, ...BANKS.map(b => ({ value: b, label: b })), { value: 'old', label: 'เก่า', disabled: true }]} />)
  return { onChange, box: screen.getByRole('combobox', { name: 'ธนาคาร' }) }
}

describe('SelectMenu', () => {
  it('reads the picked option, and a quiet placeholder while nothing is picked', () => {
    show('KTB')
    expect(screen.getByRole('combobox', { name: 'ธนาคาร' })).toHaveTextContent('KTB')
  })

  it('opens a list over the page and picks with a click', () => {
    const { onChange, box } = show()
    expect(box).toHaveTextContent('เลือก')
    fireEvent.click(box)
    expect(screen.getByRole('listbox', { name: 'ธนาคาร' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'SCB' }))
    expect(onChange).toHaveBeenCalledWith('SCB')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('searches a long list', () => {
    const { box } = show()
    fireEvent.click(box)
    fireEvent.change(screen.getByRole('textbox', { name: 'ค้นหา ธนาคาร' }), { target: { value: 'ti' } })
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['TISCO'])
  })

  it('works from the keyboard, as a select does', () => {
    const { onChange, box } = show('BBL')
    fireEvent.keyDown(box, { key: 'ArrowDown' })        // opens on BBL
    fireEvent.keyDown(box, { key: 'ArrowDown' })        // KBANK
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('KBANK')
  })

  it('never picks a disabled option', () => {
    const { onChange, box } = show()
    fireEvent.click(box)
    fireEvent.click(screen.getByRole('option', { name: 'เก่า' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
