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

describe('ActionIconButton — labelled', () => {
  it('writes the wording beside the icon, using the short form when given', () => {
    render(
      <MemoryRouter>
        <ActionIconButton showLabel label="แก้ไขเอกสาร" short="แก้ไข" to="/s/1" icon={<Pencil size={16} />} />
      </MemoryRouter>,
    )
    // Visible text is the short form; the full wording stays the accessible name.
    const link = screen.getByRole('link', { name: 'แก้ไขเอกสาร' })
    expect(link).toHaveTextContent('แก้ไข')
    expect(link).toHaveAttribute('title', 'แก้ไขเอกสาร')
    expect(link).not.toHaveClass('w-8')   // no longer a square icon-only button
  })

  it('falls back to the full label when no short form is given', () => {
    render(
      <MemoryRouter>
        <ActionIconButton showLabel label="ดูเอกสาร" to="/s/1" icon={<Pencil size={16} />} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'ดูเอกสาร' })).toHaveTextContent('ดูเอกสาร')
  })

  it('warns in red on a destructive action, and stays neutral otherwise', () => {
    render(
      <MemoryRouter>
        <ActionIconButton showLabel label="ลบเอกสาร" tone="red" onClick={() => {}} icon={<Pencil size={16} />} />
        <ActionIconButton showLabel label="พิมพ์" tone="green" onClick={() => {}} icon={<Pencil size={16} />} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'ลบเอกสาร' })).toHaveClass('text-red-600')
    const neutral = screen.getByRole('button', { name: 'พิมพ์' })
    expect(neutral).toHaveClass('text-gray-700')
    expect(neutral.className).not.toContain('text-emerald')
  })
})
