import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DateInput from './DateInput'

function setup(value = '') {
  const onChange = vi.fn()
  render(<DateInput value={value} onChange={onChange} />)
  return { onChange, field: screen.getByPlaceholderText('dd/mm/yyyy') }
}
const calendar = () => screen.queryByRole('button', { name: 'เดือนถัดไป' })

describe('DateInput', () => {
  beforeEach(() => { vi.setSystemTime(new Date(2026, 9, 9)) })   // 9 ตุลาคม 2026
  afterEach(() => { vi.useRealTimers() })

  it('คลิกในช่องวันที่ กางปฏิทินได้เลย ไม่ต้องกดไอคอน', () => {
    const { field } = setup()
    expect(calendar()).not.toBeInTheDocument()
    fireEvent.click(field)
    expect(calendar()).toBeInTheDocument()
  })

  it('ไอคอนปฏิทินเปิดและปิดปฏิทินได้', () => {
    setup()
    const icon = screen.getByRole('button', { name: 'เลือกวันที่' })
    fireEvent.click(icon)
    expect(calendar()).toBeInTheDocument()
    fireEvent.click(icon)
    expect(calendar()).not.toBeInTheDocument()
  })

  it('เปิดมาที่เดือนของวันที่ในช่อง', () => {
    const { field } = setup('2026-03-15')
    fireEvent.click(field)
    expect(screen.getByText('มีนาคม 2026')).toBeInTheDocument()
  })

  it('ช่องว่างเปิดมาที่เดือนปัจจุบัน', () => {
    const { field } = setup()
    fireEvent.click(field)
    expect(screen.getByText('ตุลาคม 2026')).toBeInTheDocument()
  })

  it('กดวันในปฏิทิน ได้ค่าเป็น yyyy-mm-dd และปฏิทินปิด', () => {
    const { field, onChange } = setup('2026-10-01')
    fireEvent.click(field)
    fireEvent.click(screen.getByRole('button', { name: '15 ตุลาคม 2026' }))
    expect(onChange).toHaveBeenCalledWith('2026-10-15')
    expect(calendar()).not.toBeInTheDocument()
    expect((field as HTMLInputElement).value).toBe('15/10/2026')
  })

  it('เลื่อนเดือนไปข้างหน้าและย้อนกลับได้', () => {
    const { field } = setup('2026-10-09')
    fireEvent.click(field)
    fireEvent.click(screen.getByRole('button', { name: 'เดือนถัดไป' }))
    expect(screen.getByText('พฤศจิกายน 2026')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'เดือนก่อนหน้า' }))
    fireEvent.click(screen.getByRole('button', { name: 'เดือนก่อนหน้า' }))
    expect(screen.getByText('กันยายน 2026')).toBeInTheDocument()
  })

  it('ข้ามปีได้จากหัวปฏิทิน', () => {
    const { field } = setup('2026-10-09')
    fireEvent.click(field)
    fireEvent.click(screen.getByRole('button', { name: 'ตุลาคม 2026' }))
    fireEvent.click(screen.getByRole('button', { name: '2024' }))
    expect(screen.getByText('ตุลาคม 2024')).toBeInTheDocument()
  })

  it('ปุ่ม “วันนี้” เลือกวันปัจจุบัน', () => {
    const { field, onChange } = setup('')
    fireEvent.click(field)
    fireEvent.click(screen.getByRole('button', { name: 'วันนี้' }))
    expect(onChange).toHaveBeenCalledWith('2026-10-09')
  })

  it('ปุ่ม “ล้าง” เอาวันที่ออก', () => {
    const { field, onChange } = setup('2026-10-09')
    fireEvent.click(field)
    fireEvent.click(screen.getByRole('button', { name: 'ล้าง' }))
    expect(onChange).toHaveBeenCalledWith('')
    expect((field as HTMLInputElement).value).toBe('')
  })

  it('ยังพิมพ์วันที่เองได้ ระบบใส่ / ให้ และส่งค่าเป็น yyyy-mm-dd', () => {
    const { field, onChange } = setup()
    fireEvent.change(field, { target: { value: '05102026' } })
    expect((field as HTMLInputElement).value).toBe('05/10/2026')
    expect(onChange).toHaveBeenLastCalledWith('2026-10-05')
  })

  it('กดนอกปฏิทิน แล้วปฏิทินปิด', () => {
    const { field } = setup()
    fireEvent.click(field)
    fireEvent.mouseDown(document.body)
    expect(calendar()).not.toBeInTheDocument()
  })

  it('กด Escape แล้วปฏิทินปิด', () => {
    const { field } = setup()
    fireEvent.click(field)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(calendar()).not.toBeInTheDocument()
  })
})
