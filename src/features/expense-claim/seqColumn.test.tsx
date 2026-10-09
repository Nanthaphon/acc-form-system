import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { showSeqColumn, EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import type { ExpenseRow, FormColumn, FormSettings } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const header = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: '', job: '' }
const items: ExpenseRow[] = [{ detail: 'ค่าแท็กซี่', amount: 380 }, { detail: 'ค่าที่พัก', amount: 1200 }]
const settings = (showSeq?: boolean): FormSettings => ({ ...EXPENSE_CLAIM_DEFAULTS, columns: cols, showSeq })

const headings = (container: HTMLElement) => [...container.querySelectorAll('thead th')].map(th => th.textContent)

describe('showSeqColumn', () => {
  it('is on unless the form turned it off — forms saved before it keep their numbers', () => {
    expect(showSeqColumn(undefined)).toBe(true)
    expect(showSeqColumn({})).toBe(true)
    expect(showSeqColumn({ showSeq: true })).toBe(true)
    expect(showSeqColumn({ showSeq: false })).toBe(false)
  })
})

describe('the ลำดับ column on the printed document', () => {
  it('is there by default, numbering each row', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={settings()} />)
    expect(headings(container)[0]).toBe('ลำดับ')
    expect([...container.querySelectorAll('tbody tr')][0].children[0].textContent).toBe('1')
  })

  it('is gone when the form turns it off', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={settings(false)} />)
    expect(headings(container)).not.toContain('ลำดับ')
    expect(headings(container)[0]).toBe('รายละเอียด')
    // the first cell of a row is now the detail, not a number
    expect([...container.querySelectorAll('tbody tr')][0].children[0].textContent).toBe('ค่าแท็กซี่')
  })

  it('gives the freed millimetres to the other columns', () => {
    const width = (s: FormSettings) => {
      const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={s} />)
      const th = [...container.querySelectorAll('thead th')].find(x => x.textContent === 'รายละเอียด') as HTMLElement
      return parseFloat(th.style.width)
    }
    expect(width(settings(false))).toBeGreaterThan(width(settings()))
  })

  it('keeps the รวมทั้งสิ้น row lined up with the figures it sums', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={items} docNumber="X" settings={settings(false)} />)
    const rows = [...container.querySelectorAll('tbody tr')]
    const totals = rows[rows.length - 1]
    // label + the amount column: as many cells as the table has columns
    const cells = [...totals.children]
    const span = cells.reduce((n, td) => n + (Number((td as HTMLTableCellElement).colSpan) || 1), 0)
    expect(span).toBe(headings(container).length)
  })
})

describe('the # column on the fill page', () => {
  it('is there by default', () => {
    render(<ExpenseClaimForm header={header} items={items} columns={cols} onHeaderChange={() => {}} onItemsChange={() => {}} />)
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument()
  })

  it('is gone when the form turns it off', () => {
    render(<ExpenseClaimForm header={header} items={items} columns={cols} onHeaderChange={() => {}} onItemsChange={() => {}} showSeq={false} />)
    expect(screen.queryByRole('columnheader', { name: '#' })).not.toBeInTheDocument()
  })
})
