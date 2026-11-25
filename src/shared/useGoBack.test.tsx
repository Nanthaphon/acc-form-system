import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { useGoBack } from './useGoBack'

function Back() {
  const goBack = useGoBack()
  return <button onClick={() => goBack('/group/g1')}>กลับ</button>
}
function History() {
  const nav = useNavigate()
  return <button onClick={() => nav('/form/x?revise=1')}>แก้ไขเป็นฉบับใหม่</button>
}
const app = (entries: string[]) => render(
  <MemoryRouter initialEntries={entries}>
    <Routes>
      <Route path="/history" element={<><h1>ประวัติ</h1><History /></>} />
      <Route path="/form/:t" element={<Back />} />
      <Route path="/group/:g" element={<h1>เลือกฟอร์ม</h1>} />
    </Routes>
  </MemoryRouter>,
)

describe('useGoBack', () => {
  it('goes back to the page the person came from — not the form picker', () => {
    app(['/history'])
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขเป็นฉบับใหม่' }))
    fireEvent.click(screen.getByRole('button', { name: 'กลับ' }))
    expect(screen.getByRole('heading', { name: 'ประวัติ' })).toBeInTheDocument()
  })

  it('opened straight from a link, goes to the fallback instead of leaving the app', () => {
    app(['/form/x?revise=1'])
    fireEvent.click(screen.getByRole('button', { name: 'กลับ' }))
    expect(screen.getByRole('heading', { name: 'เลือกฟอร์ม' })).toBeInTheDocument()
  })
})
