import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DateInput from './DateInput'

function setup(value = '') {
  const onChange = vi.fn()
  const { container } = render(<DateInput value={value} onChange={onChange} />)
  const picker = container.querySelector('input[type="date"]') as HTMLInputElement
  const showPicker = vi.fn()
  picker.showPicker = showPicker
  return { onChange, showPicker, field: screen.getByPlaceholderText('dd/mm/yyyy') }
}

describe('DateInput', () => {
  it('คลิกในช่องวันที่ เปิดปฏิทินได้เลย ไม่ต้องกดไอคอน', () => {
    const { field, showPicker } = setup()
    fireEvent.click(field)
    expect(showPicker).toHaveBeenCalledTimes(1)
  })

  it('ไอคอนปฏิทินยังเปิดปฏิทินได้เหมือนเดิม', () => {
    const { showPicker } = setup()
    fireEvent.click(screen.getByTitle('เลือกวันที่'))
    expect(showPicker).toHaveBeenCalledTimes(1)
  })

  it('ยังพิมพ์วันที่เองได้ และส่งค่าเป็น yyyy-mm-dd', () => {
    const { field, onChange } = setup()
    fireEvent.change(field, { target: { value: '05102026' } })
    expect(onChange).toHaveBeenLastCalledWith('2026-10-05')
  })

  it('เบราว์เซอร์ที่เปิดปฏิทินไม่ได้ ไม่ทำให้หน้าพัง', () => {
    const { field, showPicker } = setup()
    showPicker.mockImplementation(() => { throw new Error('NotAllowedError') })
    expect(() => fireEvent.click(field)).not.toThrow()
  })
})
