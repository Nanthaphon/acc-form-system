import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TemplateTextarea from './TemplateTextarea'
import { uiPrompt } from './dialog/dialogService'

vi.mock('./dialog/dialogService', () => ({ uiPrompt: vi.fn().mockResolvedValue('ผู้จ่าย'), uiAlert: vi.fn() }))

describe('TemplateTextarea', () => {
  it('offers the convert button only when there are dotted blanks', () => {
    const { rerender } = render(<TemplateTextarea value="จาก {{ผู้จ่าย}}" onChange={() => {}} />)
    expect(screen.queryByText(/แปลง/)).not.toBeInTheDocument()
    rerender(<TemplateTextarea value="จาก ........" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /แปลง/ })).toBeInTheDocument()
  })

  it('converts old dotted blanks into fields in one click', () => {
    const onChange = vi.fn()
    render(<TemplateTextarea value="ได้รับเงินจาก ........ ครบถ้วน" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /แปลง/ }))
    expect(onChange).toHaveBeenCalledWith('ได้รับเงินจาก {{ได้รับเงินจาก}} ครบถ้วน')
  })

  it('inserts a named field at the cursor', async () => {
    const onChange = vi.fn()
    render(<TemplateTextarea value="จาก  บาท" onChange={onChange} />)
    const box = screen.getByRole('textbox') as HTMLTextAreaElement
    box.setSelectionRange(4, 4)
    fireEvent.click(screen.getByRole('button', { name: /ช่องข้อความ/ }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('จาก {{ผู้จ่าย}} บาท'))
  })

  // A long list (every bank) is pasted one per line, not typed with commas.
  it('inserts a dropdown from a window: a name, and choices one per line', () => {
    const onChange = vi.fn()
    render(<TemplateTextarea value="ชำระโดย " onChange={onChange} />)
    ;(screen.getByRole('textbox') as HTMLTextAreaElement).setSelectionRange(8, 8)
    fireEvent.click(screen.getByRole('button', { name: 'แทรกช่องตัวเลือก' }))
    const dialog = screen.getByRole('dialog', { name: 'แทรกช่องตัวเลือก' })
    fireEvent.change(within(dialog).getByPlaceholderText(/ชื่อธนาคาร/), { target: { value: 'วิธีชำระ' } })
    fireEvent.change(within(dialog).getByLabelText('ตัวเลือก'), { target: { value: 'เงินสด\nโอนเงิน\n\nเช็ค\n' } })
    expect(within(dialog).getByText('3 ตัวเลือก')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'แทรก' }))
    expect(onChange).toHaveBeenCalledWith('ชำระโดย {{วิธีชำระ:เลือก=เงินสด|โอนเงิน|เช็ค}}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('adds the banks in one click', () => {
    const onChange = vi.fn()
    render(<TemplateTextarea value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'แทรกช่องตัวเลือก' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByPlaceholderText(/ชื่อธนาคาร/), { target: { value: 'ชื่อธนาคาร' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /ธนาคารในไทย/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'แทรก' }))
    expect(onChange.mock.calls[0][0]).toMatch(/^\{\{ชื่อธนาคาร:เลือก=ธนาคารกรุงเทพ\|ธนาคารกสิกรไทย\|.*\}\}$/)
  })

  it('inserts no dropdown without a choice', () => {
    const onChange = vi.fn()
    render(<TemplateTextarea value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'แทรกช่องตัวเลือก' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByPlaceholderText(/ชื่อธนาคาร/), { target: { value: 'วิธีชำระ' } })
    expect(within(dialog).getByRole('button', { name: 'แทรก' })).toBeDisabled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('opens a dropdown already written to change its choices, in place', () => {
    const onChange = vi.fn()
    render(<TemplateTextarea value="จ่ายโดย {{ธนาคาร:เลือก=กรุงเทพ|กสิกร}} เลขที่ {{เลขบัญชี}}" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'แก้ตัวเลือกช่อง ธนาคาร' }))
    const dialog = screen.getByRole('dialog', { name: 'แก้ช่องตัวเลือก' })
    const box = within(dialog).getByLabelText('ตัวเลือก') as HTMLTextAreaElement
    expect(box.value).toBe('กรุงเทพ\nกสิกร')
    fireEvent.change(box, { target: { value: 'กรุงเทพ\nกสิกร\nกรุงไทย' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'บันทึก' }))
    expect(onChange).toHaveBeenCalledWith('จ่ายโดย {{ธนาคาร:เลือก=กรุงเทพ|กสิกร|กรุงไทย}} เลขที่ {{เลขบัญชี}}')
  })

  it('with the cursor inside a dropdown, the dropdown button edits that one', () => {
    render(<TemplateTextarea value="{{ธนาคาร:เลือก=กรุงเทพ}}" onChange={() => {}} />)
    ;(screen.getByRole('textbox') as HTMLTextAreaElement).setSelectionRange(5, 5)
    fireEvent.click(screen.getByRole('button', { name: 'แทรกช่องตัวเลือก' }))
    expect(screen.getByRole('dialog', { name: 'แก้ช่องตัวเลือก' })).toBeInTheDocument()
  })
})

describe('TemplateTextarea — automatic fields', () => {
  it('inserts one picked from a list, at the cursor, with nothing to type', () => {
    vi.mocked(uiPrompt).mockClear()
    const onChange = vi.fn()
    render(<TemplateTextarea value=" ได้รับเงินจาก" onChange={onChange} />)
    ;(screen.getByRole('textbox') as HTMLTextAreaElement).setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: 'แทรกช่องอัตโนมัติ' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /ชื่อบริษัท/ }))
    expect(onChange).toHaveBeenCalledWith('{{ชื่อบริษัท:อัตโนมัติ}} ได้รับเงินจาก')
    expect(uiPrompt).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
