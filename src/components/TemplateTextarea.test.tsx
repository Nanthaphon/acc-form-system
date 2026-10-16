import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TemplateTextarea from './TemplateTextarea'
import { uiAlert, uiPrompt } from './dialog/dialogService'

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

  it('inserts a dropdown: asks its name, then its choices', async () => {
    vi.mocked(uiPrompt).mockResolvedValueOnce('วิธีชำระ').mockResolvedValueOnce('เงินสด, โอนเงิน, เช็ค')
    const onChange = vi.fn()
    render(<TemplateTextarea value="ชำระโดย " onChange={onChange} />)
    ;(screen.getByRole('textbox') as HTMLTextAreaElement).setSelectionRange(8, 8)
    fireEvent.click(screen.getByRole('button', { name: 'แทรกช่องตัวเลือก' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('ชำระโดย {{วิธีชำระ:เลือก=เงินสด|โอนเงิน|เช็ค}}'))
  })

  it('inserts no dropdown without a choice', async () => {
    vi.mocked(uiPrompt).mockResolvedValueOnce('วิธีชำระ').mockResolvedValueOnce(' , ')
    const onChange = vi.fn()
    render(<TemplateTextarea value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'แทรกช่องตัวเลือก' }))
    await waitFor(() => expect(uiAlert).toHaveBeenCalled())
    expect(onChange).not.toHaveBeenCalled()
  })
})
