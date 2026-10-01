import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NavCountBadge from './NavCountBadge'

describe('NavCountBadge', () => {
  it('shows nothing when there is nothing waiting', () => {
    const { container } = render(<NavCountBadge count={0} label="รอเซ็น 0 ฉบับ" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('reads the count out to screen readers and caps the digits', () => {
    const { rerender } = render(<NavCountBadge count={3} label="รอเซ็น 3 ฉบับ" />)
    expect(screen.getByLabelText('รอเซ็น 3 ฉบับ')).toHaveTextContent('3')
    rerender(<NavCountBadge count={120} label="รอเซ็น 120 ฉบับ" />)
    expect(screen.getByLabelText('รอเซ็น 120 ฉบับ')).toHaveTextContent('99+')
  })

  it('turns white on the highlighted row, red elsewhere', () => {
    const { rerender } = render(<NavCountBadge count={1} label="รอเซ็น 1 ฉบับ" active />)
    expect(screen.getByLabelText('รอเซ็น 1 ฉบับ')).toHaveClass('bg-white')
    rerender(<NavCountBadge count={1} label="รอเซ็น 1 ฉบับ" />)
    expect(screen.getByLabelText('รอเซ็น 1 ฉบับ')).toHaveClass('from-brick-500')
  })
})
