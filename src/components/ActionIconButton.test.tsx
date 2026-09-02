import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import ActionIconButton from './ActionIconButton'

describe('ActionIconButton', () => {
  it('renders an icon-only link with an accessible label', () => {
    render(
      <MemoryRouter>
        <ActionIconButton label="แก้ไข" to="/submission/1" icon={<Pencil size={16} />} />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'แก้ไข' })
    expect(link).toHaveAttribute('href', '/submission/1')
    expect(link).toHaveAttribute('title', 'แก้ไข')
    expect(link).toHaveClass('h-8')
  })

  it('uses one neutral black icon style even when a tone is provided', () => {
    render(
      <MemoryRouter>
        <ActionIconButton label="พิมพ์" to="/print" tone="green" icon={<Pencil size={16} />} />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'พิมพ์' })
    expect(link).toHaveClass('text-gray-900')
    expect(link.className).not.toContain('text-emerald')
  })
})
