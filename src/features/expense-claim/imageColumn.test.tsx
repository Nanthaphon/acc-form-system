import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import type { ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'name', label: 'PC Name', type: 'text' },
  { key: 'rate', label: 'วันละ', type: 'number', isTotal: true },
  { key: 'book', label: 'หลักฐาน', type: 'image' },
]
const header = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: 'PC', job: '' }
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols, formCode: 'GAC69-005', title: 'ใบเบิกค่าใช้จ่าย' }
const row = (over: Partial<ExpenseRow> = {}): ExpenseRow => ({ name: '', rate: '', book: '', ...over })

describe('image column on the fill page', () => {
  it('an empty cell offers แนบรูป, and the picked picture lands in the cell', async () => {
    const onItemsChange = vi.fn()
    const pick = vi.fn().mockResolvedValue('pending:abc')
    render(<ExpenseClaimForm header={header} items={[row()]} columns={cols} onHeaderChange={() => {}} onItemsChange={onItemsChange} images={{ urls: {}, pick }} />)
    const file = new File(['x'], 'book.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('แนบรูป หลักฐาน แถว 1'), { target: { files: [file] } })
    await waitFor(() => expect(onItemsChange).toHaveBeenCalled())
    expect(pick).toHaveBeenCalledWith(file)
    expect(onItemsChange.mock.calls[0][0][0].book).toBe('pending:abc')
  })

  it('a filled cell shows the thumbnail, and the cross takes the picture out', () => {
    const onItemsChange = vi.fn()
    render(<ExpenseClaimForm header={header} items={[row({ book: 'doc/img-1.jpg' })]} columns={cols} onHeaderChange={() => {}} onItemsChange={onItemsChange}
      images={{ urls: { 'doc/img-1.jpg': 'https://x/1.jpg' }, pick: vi.fn() }} />)
    expect(screen.getByAltText('รูป หลักฐาน แถว 1')).toHaveAttribute('src', 'https://x/1.jpg')
    fireEvent.click(screen.getByRole('button', { name: 'เอารูป หลักฐาน แถว 1 ออก' }))
    expect(onItemsChange.mock.calls[0][0][0].book).toBe('')
  })

  it('a picture cell does not count as a number typed into the row', () => {
    render(<ExpenseClaimForm header={header} items={[row({ book: 'doc/img-1.jpg' })]} columns={cols} onHeaderChange={() => {}} onItemsChange={() => {}} images={{ urls: {}, pick: vi.fn() }} />)
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
  })
})

describe('image column on the printed document', () => {
  const items = [row({ name: 'นภา แสงทอง', rate: 1000, book: 'doc/a.jpg' }), row({ name: 'ธีรวัฒน์', rate: 900 }), row({ name: 'กิตติ', rate: 800, book: 'doc/b.jpg' })]
  const urls = { 'doc/a.jpg': 'https://x/a.jpg', 'doc/b.jpg': 'https://x/b.jpg' }

  it('numbers each picture in its cell', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="GAC69-005-202610-0001" settings={settings} imageUrls={urls} />)
    const bodyRows = [...container.querySelectorAll('table tbody tr')].slice(0, 3)
    expect(bodyRows.map(r => r.lastElementChild?.textContent)).toEqual(['รูป 1', '', 'รูป 2'])
  })

  it('adds an attachment page with each picture full size and what row it belongs to', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="GAC69-005-202610-0001" settings={settings} imageUrls={urls} />)
    expect(container.querySelectorAll('.doc-page')).toHaveLength(2)
    expect(screen.getByText('เอกสารแนบ — ใบเบิกค่าใช้จ่าย')).toBeInTheDocument()
    expect(screen.getByText('เลขที่ GAC69-005-202610-0001')).toBeInTheDocument()
    expect(screen.getByAltText('รูป 1')).toHaveAttribute('src', 'https://x/a.jpg')
    const captions = [...container.querySelectorAll('figcaption')].map(c => c.textContent)
    expect(captions).toEqual(['รูป 1 · แถว 1 · หลักฐาน · นภา แสงทอง', 'รูป 2 · แถว 3 · หลักฐาน · กิตติ'])
  })

  it('two pictures to an attachment page', () => {
    const many = Array.from({ length: 5 }, (_, i) => row({ name: `PC ${i + 1}`, rate: 100, book: `doc/${i}.jpg` }))
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={many} docNumber="X" settings={settings} />)
    expect(container.querySelectorAll('.doc-page')).toHaveLength(4) // the form + 3 attachment pages
    expect(screen.getByText('แผ่นแนบ 3 / 3')).toBeInTheDocument()
  })

  it('no pictures, no attachment page', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={[row({ name: 'ก', rate: 1 })]} docNumber="X" settings={settings} />)
    expect(container.querySelectorAll('.doc-page')).toHaveLength(1)
  })
})
