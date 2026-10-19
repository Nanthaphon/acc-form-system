import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Pencil, Send, Trash2, RotateCcw } from 'lucide-react'
import { ActionGroup, ActionGroupItem, PrimaryAction, RowMenu } from './RowActions'

describe('ActionGroup', () => {
  it('joins the everyday actions, each a labelled link', () => {
    render(<MemoryRouter><ActionGroup>
      <ActionGroupItem label="แก้ไขเอกสาร" short="แก้ไข" to="/submission/1" icon={<Pencil />} />
    </ActionGroup></MemoryRouter>)
    const edit = screen.getByRole('link', { name: 'แก้ไขเอกสาร' })
    expect(edit).toHaveAttribute('href', '/submission/1')
    expect(edit).toHaveTextContent('แก้ไข')
  })
})

describe('PrimaryAction', () => {
  it('is the filled button for the step the row is waiting on', () => {
    const onClick = vi.fn()
    render(<PrimaryAction label="ส่งให้คนอื่นเซ็น" short="ส่งให้เซ็น" onClick={onClick} icon={<Send />} />)
    const b = screen.getByRole('button', { name: 'ส่งให้คนอื่นเซ็น' })
    expect(b).toHaveClass('bg-clay-600', 'text-white')
    fireEvent.click(b)
    expect(onClick).toHaveBeenCalled()
  })
})

describe('RowMenu', () => {
  const setup = () => {
    const cancel = vi.fn(), del = vi.fn()
    render(<RowMenu label="ตัวเลือกเพิ่มเติม X" items={[
      { label: 'ยกเลิกการส่งให้เซ็น', icon: <RotateCcw />, onClick: cancel },
      { label: 'ลบเอกสาร', icon: <Trash2 />, onClick: del, danger: true },
    ]} />)
    return { cancel, del, toggle: screen.getByRole('button', { name: 'ตัวเลือกเพิ่มเติม X' }) }
  }

  it('keeps its items out of sight until opened', () => {
    const { toggle } = setup()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('menuitem').map(i => i.textContent)).toEqual(['ยกเลิกการส่งให้เซ็น', 'ลบเอกสาร'])
  })

  it('runs the item picked and closes', () => {
    const { toggle, del, cancel } = setup()
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('menuitem', { name: 'ลบเอกสาร' }))
    expect(del).toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marks the destructive item, and closes on Escape or a click elsewhere', () => {
    const { toggle } = setup()
    fireEvent.click(toggle)
    expect(screen.getByRole('menuitem', { name: 'ลบเอกสาร' })).toHaveClass('text-brick-600')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
