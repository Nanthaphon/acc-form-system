import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TemplateTextarea from './TemplateTextarea'

vi.mock('./dialog/dialogService', () => ({ uiPrompt: vi.fn().mockResolvedValue('ผู้จ่าย') }))

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
})
