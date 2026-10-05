import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import ManualPage from './ManualPage'
import { MANUAL_SLIDES, clampSlide, manualSlideSrc } from '../shared/manual'

const TOTAL = MANUAL_SLIDES.length

function Where() { return <div data-testid="where">{useLocation().search}</div> }
function open(url = '/manual') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/manual" element={<><ManualPage /><Where /></>} /></Routes>
    </MemoryRouter>,
  )
}
const slide = () => screen.getByRole('img', { name: /^หน้า \d+:/ }) as HTMLImageElement

describe('ManualPage', () => {
  it('เปิดมาที่หน้าแรกของคู่มือ', () => {
    open()
    expect(slide().getAttribute('src')).toBe('/guide/slide-01.webp')
    expect(screen.getByText(`หน้า 1 / ${TOTAL} · ใช้ปุ่มลูกศรบนคีย์บอร์ดเปลี่ยนหน้าได้`)).toBeInTheDocument()
  })

  it('ปุ่มถัดไปและก่อนหน้าเปลี่ยนหน้า และจำเลขหน้าไว้ในลิงก์', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }))
    expect(slide().getAttribute('src')).toBe('/guide/slide-02.webp')
    expect(screen.getByTestId('where').textContent).toBe('?p=2')
    fireEvent.click(screen.getByRole('button', { name: 'ก่อนหน้า' }))
    expect(slide().getAttribute('src')).toBe('/guide/slide-01.webp')
  })

  it('ใช้ปุ่มลูกศรบนคีย์บอร์ดได้', () => {
    open('/manual?p=5')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(slide().getAttribute('src')).toBe('/guide/slide-06.webp')
    fireEvent.keyDown(window, { key: 'End' })
    expect(slide().getAttribute('src')).toBe(manualSlideSrc(TOTAL))
  })

  it('กดหัวข้อในสารบัญ ไปหน้านั้นทันที', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: /ส่งเอกสารให้หัวหน้าเซ็น/ }))
    const n = MANUAL_SLIDES.findIndex(s => s.title === 'ส่งเอกสารให้หัวหน้าเซ็น') + 1
    expect(slide().getAttribute('src')).toBe(manualSlideSrc(n))
    expect(screen.getByRole('button', { name: /ส่งเอกสารให้หัวหน้าเซ็น/ })).toHaveAttribute('aria-current', 'page')
  })

  it('หน้าแรกกดย้อนไม่ได้ หน้าสุดท้ายกดต่อไม่ได้', () => {
    open(`/manual?p=${TOTAL}`)
    expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeDisabled()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(slide().getAttribute('src')).toBe(manualSlideSrc(TOTAL))
  })

  it('มีปุ่มดาวน์โหลดไฟล์ PDF', () => {
    open()
    expect(screen.getByRole('link', { name: /ดาวน์โหลด PDF/ })).toHaveAttribute('href', '/guide/acc-documents-manual.pdf')
  })
})

describe('clampSlide', () => {
  it('เลขหน้าที่ผิด หรือเกินจำนวนหน้า ไม่ทำให้หน้าพัง', () => {
    expect(clampSlide(null)).toBe(1)
    expect(clampSlide('abc')).toBe(1)
    expect(clampSlide('0')).toBe(1)
    expect(clampSlide('7')).toBe(7)
    expect(clampSlide('999')).toBe(TOTAL)
  })
})
