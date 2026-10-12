import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { rowNet, ROW_VAT_KEY, ROW_WHT_KEY, TICK } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
// The document in the report: two lines of 10,000, VAT on both, 3% on the first.
const items: ExpenseRow[] = [
  { detail: 'a', amount: 10000, [ROW_VAT_KEY]: TICK, [ROW_WHT_KEY]: TICK },
  { detail: 'b', amount: 10000, [ROW_VAT_KEY]: TICK },
]
const header: ExpenseHeader = {
  subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '',
  vat: true, vatScope: 'rows', whtRate: 3, whtScope: 'rows', showRowNet: true,
}

describe('what one line comes to after its own taxes', () => {
  it('adds the VAT it is ticked for and takes off the withholding', () => {
    expect(rowNet(cols, items[0], header)).toBe(10400)   // 10,000 + 700 − 300
    expect(rowNet(cols, items[1], header)).toBe(10700)   // 10,000 + 700
  })

  it('charges every line when the tax is on the whole document', () => {
    const all: ExpenseHeader = { ...header, vatScope: 'all', whtScope: 'all' }
    expect(rowNet(cols, { detail: 'b', amount: 10000 }, all)).toBe(10400)
  })

  it('leaves a line alone when no tax reaches it', () => {
    expect(rowNet(cols, { detail: 'b', amount: 10000 }, { ...header })).toBe(10000)
  })

  it('takes each line its share of ค่าประกันงาน, which is held on the whole document', () => {
    expect(rowNet(cols, { detail: 'b', amount: 10000 }, { retentionRate: 5 })).toBe(9500)
  })

  it('adds up to the document total', () => {
    const sum = items.reduce((s, r) => s + rowNet(cols, r, header), 0)
    expect(sum).toBe(21100)   // 20,000 + 1,400 − 300
  })
})

describe('the สุทธิ column on the fill-in screen', () => {
  const show = (h: ExpenseHeader = header, onHeaderChange = vi.fn()) => {
    render(<ExpenseClaimForm header={h} items={items} columns={cols} onHeaderChange={onHeaderChange} onItemsChange={vi.fn()} />)
    return onHeaderChange
  }

  it('shows each line after tax, and the document total under it', () => {
    show()
    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(within(rows[1]).getByText('10,400.00')).toBeInTheDocument()
    expect(within(rows[2]).getByText('10,700.00')).toBeInTheDocument()
    expect(within(rows[3]).getByText('21,100.00')).toBeInTheDocument()
  })

  it('is off until it is asked for', () => {
    show({ ...header, showRowNet: false })
    expect(screen.queryByText('10,400.00')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'สุทธิ' })).not.toBeInTheDocument()
  })

  it('is turned on per document, and saved with it', () => {
    const onHeaderChange = show({ ...header, showRowNet: false })
    fireEvent.click(screen.getByLabelText('แสดงยอดสุทธิรายรายการ'))
    expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({ showRowNet: true }))
  })

  it('says what each tax was worked out from', () => {
    show()
    expect(screen.getByText(/ภาษีมูลค่าเพิ่ม 7% \(จาก 20,000\.00 · 2 รายการ\)/)).toBeInTheDocument()
    expect(screen.getByText(/หัก ณ ที่จ่าย 3% \(จาก 10,000\.00 · 1 รายการ\)/)).toBeInTheDocument()
  })
})

describe('the สุทธิ column on the printed sheet', () => {
  const sheet = (h: ExpenseHeader) => {
    const { container } = render(
      <ExpenseClaimPreview company={null} header={h} items={items} docNumber="GAC-001"
        settings={{ ...EXPENSE_CLAIM_DEFAULTS, columns: cols }} />,
    )
    return container
  }

  it('prints the column when the document asks for it', () => {
    const c = sheet(header)
    expect(within(c).getByText('สุทธิ')).toBeInTheDocument()
    expect(within(c).getByText('10,400.00')).toBeInTheDocument()
    expect(within(c).getByText('10,700.00')).toBeInTheDocument()
  })

  it('prints nothing of it otherwise', () => {
    const c = sheet({ ...header, showRowNet: false })
    expect(within(c).queryByText('สุทธิ')).not.toBeInTheDocument()
    expect(within(c).queryByText('10,400.00')).not.toBeInTheDocument()
  })
})
