import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

vi.mock('../data/auth', () => ({ loginWithEmployeeId: vi.fn().mockRejectedValue(new Error('bad')) }))

describe('LoginPage', () => {
  it('แสดง error เมื่อล็อกอินล้มเหลว', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('เข้าสู่ระบบ', { selector: 'button' }))
    await waitFor(() => expect(screen.getByText(/ไม่ถูกต้อง/)).toBeInTheDocument())
  })
})
