import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'
import { loginWithEmployeeId } from '../data/auth'

vi.mock('../data/auth', () => ({ loginWithEmployeeId: vi.fn().mockRejectedValue(new Error('bad')) }))

const signIn = () => fireEvent.click(screen.getByText('เข้าสู่ระบบ', { selector: 'button' }))

describe('LoginPage', () => {
  it('แสดง error เมื่อล็อกอินล้มเหลว', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    signIn()
    await waitFor(() => expect(screen.getByText(/ไม่ถูกต้อง/)).toBeInTheDocument())
  })

  // A link in a mail: sign in, then land on the document it pointed to.
  it('กลับไปหน้าที่ลิงก์พามา หลังล็อกอินสำเร็จ', async () => {
    vi.mocked(loginWithEmployeeId).mockResolvedValueOnce({} as never)
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/submission/abc/preview' } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/submission/:id/preview" element={<p>เอกสาร abc</p>} />
          <Route path="/" element={<p>หน้าแรก</p>} />
        </Routes>
      </MemoryRouter>,
    )
    signIn()
    expect(await screen.findByText('เอกสาร abc')).toBeInTheDocument()
  })

  it('ไปหน้าแรกเมื่อไม่ได้มาจากลิงก์ใด', async () => {
    vi.mocked(loginWithEmployeeId).mockResolvedValueOnce({} as never)
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>หน้าแรก</p>} />
        </Routes>
      </MemoryRouter>,
    )
    signIn()
    expect(await screen.findByText('หน้าแรก')).toBeInTheDocument()
  })
})
