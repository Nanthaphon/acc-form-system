import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MultiSelect from './MultiSelect'

const options = [
  { value: 'a', label: 'Design Experience' },
  { value: 'b', label: 'PcMs' },
  { value: 'c', label: 'Business Developement' },
]
const trigger = (container: HTMLElement) => container.querySelector('[aria-haspopup="listbox"]') as HTMLElement

describe('MultiSelect', () => {
  it('shows the placeholder while nothing is selected', () => {
    render(<MultiSelect options={options} value={[]} onChange={() => {}} placeholder="ทุกคนเห็น" />)
    expect(screen.getByText('ทุกคนเห็น')).toBeInTheDocument()
  })

  it('filters by the search text and adds the picked option', () => {
    const onChange = vi.fn()
    const { container } = render(<MultiSelect options={options} value={['a']} onChange={onChange} searchPlaceholder="ค้นหากลุ่ม" />)
    fireEvent.click(trigger(container))
    fireEvent.change(screen.getByPlaceholderText('ค้นหากลุ่ม'), { target: { value: 'pc' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    fireEvent.click(screen.getByText('PcMs'))
    expect(onChange).toHaveBeenCalledWith(['a', 'b'])
  })

  it('removes a chip without opening the list', () => {
    const onChange = vi.fn()
    render(<MultiSelect options={options} value={['a', 'b']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('เอา PcMs ออก'))
    expect(onChange).toHaveBeenCalledWith(['a'])
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('clears every pick from the footer', () => {
    const onChange = vi.fn()
    const { container } = render(<MultiSelect options={options} value={['a', 'c']} onChange={onChange} />)
    fireEvent.click(trigger(container))
    fireEvent.click(screen.getByText('ล้างทั้งหมด'))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
