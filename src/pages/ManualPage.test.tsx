import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ADMIN_MANUAL, EMPLOYEE_MANUAL, clampSlide, manualSlideSrc, manualSlides, partRanges } from '../shared/manual'

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))
vi.mock('../auth/AuthProvider', () => ({ useAuth }))

const { default: ManualPage } = await import('./ManualPage')

const EMP_TOTAL = manualSlides(EMPLOYEE_MANUAL).length
const ADMIN_TOTAL = manualSlides(ADMIN_MANUAL).length

function Where() { return <div data-testid="where">{useLocation().search}</div> }
function open(url = '/manual', role: 'employee' | 'admin' = 'employee') {
  useAuth.mockReturnValue({ profile: { uid: 'u1', role } })
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/manual" element={<><ManualPage /><Where /></>} /></Routes>
    </MemoryRouter>,
  )
}
const slide = () => screen.getByRole('img', { name: /^หน้า \d+:/ }) as HTMLImageElement
const topic = (name: string) => screen.getByRole('button', { name })

describe('ManualPage — employees', () => {
  it('เปิดมาที่หน้าแรกของคู่มือพนักงาน และไม่มีแท็บคู่มือผู้ดูแลระบบ', () => {
    open()
    expect(slide().getAttribute('src')).toBe('/guide/slide-01.webp')
    expect(screen.getByText(`หน้า 1 / ${EMP_TOTAL} · ใช้ปุ่มลูกศรบนคีย์บอร์ดเปลี่ยนหน้าได้`)).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('พนักงานขอดูคู่มือผู้ดูแลระบบผ่านลิงก์ ก็ยังได้คู่มือพนักงาน', () => {
    open('/manual?m=admin')
    expect(slide().getAttribute('src')).toBe('/guide/slide-01.webp')
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
    expect(slide().getAttribute('src')).toBe(manualSlideSrc(EMPLOYEE_MANUAL, EMP_TOTAL))
  })

  it('หน้าสุดท้ายกดต่อไม่ได้', () => {
    open(`/manual?p=${EMP_TOTAL}`)
    expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeDisabled()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(slide().getAttribute('src')).toBe(manualSlideSrc(EMPLOYEE_MANUAL, EMP_TOTAL))
  })

  it('มีปุ่มดาวน์โหลดไฟล์ PDF ของคู่มือพนักงาน', () => {
    open()
    expect(screen.getByRole('link', { name: /ดาวน์โหลด PDF/ })).toHaveAttribute('href', '/guide/acc-documents-manual.pdf')
  })
})

describe('สารบัญ', () => {
  it('ส่วนที่กำลังอ่านกางออก ส่วนอื่นพับไว้', () => {
    open()
    expect(topic('ภาพรวมการใช้งาน 5 ขั้นตอน')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'เข้าสู่ระบบ' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ขยายหัวข้อ เริ่มต้นใช้งาน' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('กดหัวข้อ ไปหน้านั้น และหัวข้อนั้นถูกไฮไลต์', () => {
    open('/manual?p=17')
    fireEvent.click(topic('ส่งเอกสารให้หัวหน้าเซ็น'))
    const n = manualSlides(EMPLOYEE_MANUAL).findIndex(s => s.title === 'ส่งเอกสารให้หัวหน้าเซ็น') + 1
    expect(slide().getAttribute('src')).toBe(manualSlideSrc(EMPLOYEE_MANUAL, n))
    expect(topic('ส่งเอกสารให้หัวหน้าเซ็น')).toHaveAttribute('aria-current', 'page')
  })

  it('กดชื่อส่วน ไปหน้าแรกของส่วนนั้น และกางหัวข้อออก', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: /^2.*กรอกและบันทึกเอกสาร/ }))
    const part = partRanges(EMPLOYEE_MANUAL).find(p => p.title === 'กรอกและบันทึกเอกสาร')!
    expect(slide().getAttribute('src')).toBe(manualSlideSrc(EMPLOYEE_MANUAL, part.first))
    expect(topic('เลือกฟอร์มที่จะใช้')).toBeInTheDocument()
  })

  it('ปุ่มลูกศรข้างชื่อส่วน กาง/พับหัวข้อได้โดยไม่เปลี่ยนหน้า', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'ขยายหัวข้อ เริ่มต้นใช้งาน' }))
    expect(topic('เข้าสู่ระบบ')).toBeInTheDocument()
    expect(slide().getAttribute('src')).toBe('/guide/slide-01.webp')
    fireEvent.click(screen.getByRole('button', { name: 'ย่อหัวข้อ เริ่มต้นใช้งาน' }))
    expect(screen.queryByRole('button', { name: 'เข้าสู่ระบบ' })).not.toBeInTheDocument()
  })

  it('หน้าแบ่งส่วนไม่ซ้ำเป็นหัวข้อในสารบัญ', () => {
    open('/manual?p=3')
    expect(screen.queryByRole('button', { name: 'ส่วนที่ 1 เริ่มต้นใช้งาน' })).not.toBeInTheDocument()
    expect(screen.getByText('4 หัวข้อ')).toBeInTheDocument()
  })
})

describe('ManualPage — admins', () => {
  it('ผู้ดูแลระบบเปิดมาเจอคู่มือผู้ดูแลระบบก่อน', () => {
    open('/manual', 'admin')
    expect(slide().getAttribute('src')).toBe('/guide/admin/slide-01.webp')
    expect(screen.getByRole('tab', { name: 'คู่มือผู้ดูแลระบบ' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('link', { name: /ดาวน์โหลด PDF/ })).toHaveAttribute('href', '/guide/admin/acc-documents-admin-manual.pdf')
    expect(screen.getByText(`หน้า 1 / ${ADMIN_TOTAL} · ใช้ปุ่มลูกศรบนคีย์บอร์ดเปลี่ยนหน้าได้`)).toBeInTheDocument()
  })

  it('สลับไปดูคู่มือพนักงานได้ และเริ่มจากหน้าแรก', () => {
    open('/manual?p=6', 'admin')
    fireEvent.click(screen.getByRole('tab', { name: 'คู่มือพนักงาน' }))
    expect(slide().getAttribute('src')).toBe('/guide/slide-01.webp')
    expect(screen.getByTestId('where').textContent).toBe('?m=employee')
  })

  it('เปลี่ยนหน้าในคู่มือพนักงาน ยังอยู่ในคู่มือพนักงาน', () => {
    open('/manual?m=employee', 'admin')
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }))
    expect(slide().getAttribute('src')).toBe('/guide/slide-02.webp')
    expect(screen.getByTestId('where').textContent).toBe('?m=employee&p=2')
  })
})

describe('manual data', () => {
  it('จำนวนหน้าตรงกับภาพสไลด์ที่มี (พนักงาน 24, ผู้ดูแลระบบ 23)', () => {
    expect(EMP_TOTAL).toBe(24)
    expect(ADMIN_TOTAL).toBe(23)
  })

  it('เลขหน้าที่ผิด หรือเกินจำนวนหน้า ไม่ทำให้หน้าพัง', () => {
    expect(clampSlide(null, 24)).toBe(1)
    expect(clampSlide('abc', 24)).toBe(1)
    expect(clampSlide('0', 24)).toBe(1)
    expect(clampSlide('7', 24)).toBe(7)
    expect(clampSlide('999', 24)).toBe(24)
  })
})
