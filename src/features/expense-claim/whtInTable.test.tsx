import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import { adoptDocumentWht, computeRow, grandTotal, taxBases, taxHeader, taxSubtotal, taxSummary, whtInTable, whtLines, ROW_WHT_KEY, ROW_WHT_RATE_KEY } from './calc'
import type { ExpenseHeader, ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// Requested by the users: the table itself shows each line's ภาษีหัก ณ ที่จ่าย
// (จำนวนเงินรวม × the rate picked on the line) and its จำนวนเงินสุทธิ
// (จำนวนเงินรวม − that), instead of typing the withholding in by hand.
const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'gross', label: 'จำนวนเงินรวม', type: 'number' },
  { key: 'wht', label: 'ภาษีหัก ณ ที่จ่าย', type: 'calc', calc: { op: 'whtRow', a: 'gross' } },
  { key: 'net', label: 'จำนวนเงินสุทธิ', type: 'calc', calc: { op: 'subtract', operands: ['gross', 'wht'] }, isTotal: true },
]
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols }
const header: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: '', job: '' }
const row = (detail: string, gross: number, rate?: number): ExpenseRow => ({ detail, gross, ...(rate ? { [ROW_WHT_RATE_KEY]: rate } : {}) })
const items = [row('ค่าขนส่ง', 2000, 1), row('ค่าบริการ', 5000, 3), row('ค่าโรงแรม', 1500)]

describe('withholding worked out in the table', () => {
  it('takes each line\'s amount at the rate picked on that line, and nets it off', () => {
    expect(computeRow(cols, items[0])).toMatchObject({ wht: 20, net: 1980 })
    expect(computeRow(cols, items[1])).toMatchObject({ wht: 150, net: 4850 })
    expect(computeRow(cols, items[2])).toMatchObject({ wht: 0, net: 1500 })     // ไม่หัก
  })

  it('reads a line ticked before lines had rates as not withheld here', () => {
    expect(computeRow(cols, { detail: 'x', gross: 1000, [ROW_WHT_KEY]: 1 })).toMatchObject({ wht: 0, net: 1000 })
  })

  // The sums under the table take the withholding as the table worked it out —
  // once, whether or not the document's own withholding is switched on.
  it('is taken off once under the table, as the table worked it out', () => {
    expect(whtInTable(cols)).toBe(true)
    expect(grandTotal(cols, items)).toBe(8330)            // the net column: 1,980 + 4,850 + 1,500
    expect(taxSubtotal(cols, items)).toBe(8500)           // before the withholding
    for (const h of [header, { ...header, whtRate: 3, whtScope: 'rows' as const }]) {
      const tax = taxSummary(taxSubtotal(cols, items), false, h.whtRate, 0, taxBases(cols, items, { wht: h.whtScope }))
      expect(tax.whtAmount).toBe(170)                     // 20 + 150, the column's own total
      expect(tax.netTotal).toBe(8330)
    }
  })

  // "ยอดรวม" ticked on จำนวนเงินรวม instead of จำนวนเงินสุทธิ — an easy slip —
  // used to leave the withholding out of ยอดสุทธิ and the amount in words.
  it('comes to the same net whichever column is marked as the total', () => {
    const grossMarked = cols.map(c => ({ ...c, isTotal: c.key === 'gross' }))
    expect(taxSubtotal(grossMarked, items)).toBe(8500)
    const tax = taxSummary(taxSubtotal(grossMarked, items), false, undefined, 0, taxBases(grossMarked, items, {}))
    expect(tax.netTotal).toBe(8330)
  })

  it('leaves forms without such a column as they were', () => {
    const plain = cols.filter(c => c.key !== 'wht')
    expect(whtInTable(plain)).toBe(false)
    expect(taxHeader(plain, { ...header, whtRate: 3 }).whtRate).toBe(3)
  })

  it('asks each line for its rate without switching withholding on, and shows what the table took below it', () => {
    const onItemsChange = vi.fn()
    const { container, unmount } = render(<ExpenseClaimForm header={header} items={[row('ค่าบริการ', 5000)]} columns={cols} onHeaderChange={vi.fn()} onItemsChange={onItemsChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 1' }), { target: { value: '3' } })
    expect(onItemsChange).toHaveBeenCalledWith([expect.objectContaining({ [ROW_WHT_RATE_KEY]: 3 })])
    // the withholding row under the table stays, showing what the table took
    const whtTaxRow = (c: HTMLElement) => [...c.querySelectorAll('[data-tax-row]')].find(r => r.textContent?.includes('หัก ณ ที่จ่าย'))
    expect(whtTaxRow(container)?.textContent).toContain('ปิดอยู่')         // no line withheld yet
    unmount()
    const taken = render(<ExpenseClaimForm header={header} items={[row('ค่าบริการ', 5000, 3)]} columns={cols} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    expect(whtTaxRow(taken.container)?.textContent).toContain('−150.00')
    expect(taken.container.textContent).toContain('4,850.00 บาท')
    taken.unmount()
    const plain = render(<ExpenseClaimForm header={header} items={[row('ค่าบริการ', 5000)]} columns={cols.filter(c => c.key !== 'wht')} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    expect(whtTaxRow(plain.container)?.querySelector('[role=switch]')).not.toBeNull()
  })

  it('prints the lines with their withholding, and no withholding line under the table', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={{ ...header, whtRate: 3, whtScope: 'rows' }} items={items} docNumber="X" settings={settings} />)
    const sheet = container.querySelector('.doc-page')!
    expect(sheet.textContent).toContain('150.00')
    expect(sheet.textContent).toContain('4,850.00')
    expect(sheet.textContent).toContain('8,330.00')
    expect(sheet.textContent).not.toMatch(/หัก ณ ที่จ่าย \d+%/)
  })

  // The person picking a rate sees what it takes in baht, right under it.
  it('shows under each line\'s rate what it comes to in baht', () => {
    const { container } = render(<ExpenseClaimForm header={header} items={[row('ค่าบริการ', 5000, 3), row('ค่าโรงแรม', 1500)]} columns={cols} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    expect([...container.querySelectorAll('[data-rate-amount]')].map(e => e.textContent)).toEqual(['150.00'])
  })

  it('works it out on the document total on a form withholding line by line below the table', () => {
    const plain: FormColumn[] = [{ key: 'detail', label: 'รายละเอียด', type: 'text' }, { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true }]
    const { container } = render(<ExpenseClaimForm header={{ ...header, whtRate: 3, whtScope: 'rows' }} items={[{ detail: 'x', amount: 2000, [ROW_WHT_RATE_KEY]: 1 }]} columns={plain} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    expect(container.querySelector('[data-rate-amount]')?.textContent).toBe('20.00')
  })

})

// Every line ไม่หัก: one switch withholds them all — by setting each line's rate,
// so the table's own columns and the sums under it still agree.
describe('withholding every line of the table at once', () => {
  const twoRows = [row('ค่าบริการ', 5000), row('ค่าขนส่ง', 2000)]
  const show = (rows: ExpenseRow[], onItemsChange = vi.fn()) =>
    ({ onItemsChange, ...render(<ExpenseClaimForm header={header} items={rows} columns={cols} onHeaderChange={vi.fn()} onItemsChange={onItemsChange} />) })

  it('switched on, gives every line the standard 3%; off, takes it off them all', () => {
    const { onItemsChange, unmount } = show(twoRows)
    fireEvent.click(screen.getByRole('switch', { name: 'หัก ณ ที่จ่าย' }))
    expect(onItemsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ [ROW_WHT_RATE_KEY]: 3 }), expect.objectContaining({ [ROW_WHT_RATE_KEY]: 3 }),
    ])
    unmount()
    const on = show([row('ค่าบริการ', 5000, 3), row('ค่าขนส่ง', 2000, 3)])
    fireEvent.click(screen.getByRole('switch', { name: 'หัก ณ ที่จ่าย' }))
    expect(on.onItemsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ [ROW_WHT_RATE_KEY]: 0 }), expect.objectContaining({ [ROW_WHT_RATE_KEY]: 0 }),
    ])
  })

  it('changes every line\'s rate at once while they all share one', () => {
    const { onItemsChange } = show([row('ค่าบริการ', 5000, 3), row('ค่าขนส่ง', 2000, 3)])
    fireEvent.change(screen.getByRole('combobox', { name: 'อัตราหัก ณ ที่จ่ายทุกรายการ' }), { target: { value: '1' } })
    expect(onItemsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ [ROW_WHT_RATE_KEY]: 1 }), expect.objectContaining({ [ROW_WHT_RATE_KEY]: 1 }),
    ])
  })

  it('leaves lines that each picked their own rate to the table', () => {
    show([row('ค่าบริการ', 5000, 3), row('ค่าขนส่ง', 2000, 1)])
    expect(screen.queryByRole('combobox', { name: 'อัตราหัก ณ ที่จ่ายทุกรายการ' })).toBeNull()
    expect(screen.getByText('อัตราเลือกในแต่ละรายการ')).toBeInTheDocument()
  })

  it('gives a line added later the rate every line has', () => {
    const { onItemsChange } = show([row('ค่าบริการ', 5000, 3)])
    fireEvent.click(screen.getByRole('button', { name: /เพิ่มรายการ/ }))
    expect(onItemsChange.mock.lastCall![0][1]).toMatchObject({ [ROW_WHT_RATE_KEY]: 3 })
  })
})

// Every form picks withholding the same way, whether or not its table has a
// column for it: one switch and rate for every line, changed line by line in
// the table. A form without the column still takes it off below the table.
describe('withholding on a form without a column for it', () => {
  const plain: FormColumn[] = [{ key: 'detail', label: 'รายละเอียด', type: 'text' }, { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true }]
  const lines: ExpenseRow[] = [{ detail: 'ค่าบริการ', amount: 5000 }, { detail: 'ค่าขนส่ง', amount: 2000 }]
  const show = (h: ExpenseHeader, rows = lines) => {
    const onHeaderChange = vi.fn(), onItemsChange = vi.fn()
    render(<ExpenseClaimForm header={h} items={rows} columns={plain} onHeaderChange={onHeaderChange} onItemsChange={onItemsChange} />)
    return { onHeaderChange, onItemsChange }
  }

  it('switched on, withholds every line at 3% — and each line shows it', () => {
    const { onHeaderChange } = show(header)
    fireEvent.click(screen.getByRole('switch', { name: 'หัก ณ ที่จ่าย' }))
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ whtRate: 3, whtScope: 'all' }))
  })

  it('shows the document\'s rate on every line, with what it comes to', () => {
    const { container } = render(<ExpenseClaimForm header={{ ...header, whtRate: 3 }} items={lines} columns={plain} onHeaderChange={vi.fn()} onItemsChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 1' })).toHaveValue('3')
    expect(screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 2' })).toHaveValue('3')
    expect([...container.querySelectorAll('[data-rate-amount]')].map(e => e.textContent)).toEqual(['150.00', '60.00'])
    expect(screen.queryByRole('radiogroup', { name: 'ขอบเขตหัก ณ ที่จ่าย' })).toBeNull()
  })

  it('one line given its own rate: every line keeps a rate of its own from then on', () => {
    const { onHeaderChange, onItemsChange } = show({ ...header, whtRate: 3 })
    fireEvent.change(screen.getByRole('combobox', { name: 'หัก ณ ที่จ่าย รายการที่ 2' }), { target: { value: '1' } })
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ whtScope: 'rows' }))
    expect(onItemsChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ [ROW_WHT_RATE_KEY]: 3 }), expect.objectContaining({ [ROW_WHT_RATE_KEY]: 1 }),
    ])
  })

  it('back to one rate for every line from the switch\'s picker', () => {
    const { onHeaderChange, onItemsChange } = show({ ...header, whtRate: 3, whtScope: 'rows' }, lines.map(l => ({ ...l, [ROW_WHT_RATE_KEY]: 5 })))
    fireEvent.change(screen.getByRole('combobox', { name: 'อัตราหัก ณ ที่จ่าย' }), { target: { value: '2' } })
    expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ whtRate: 2, whtScope: 'all' }))
    expect(onItemsChange).toHaveBeenCalled()
  })

  // A document saved as ทั้งเอกสาร 5% before this is still 5% of everything.
  it('leaves a document saved at one rate for everything as it was', () => {
    const tax = taxSummary(7000, false, 5, 0, taxBases(plain, lines, { wht: 'all' }))
    expect(tax.whtAmount).toBe(350)
  })
})

// Found in review before going live.
describe('withholding in the table — the sums under it', () => {
  const vatCols: FormColumn[] = [
    { key: 'detail', label: 'รายละเอียด', type: 'text' },
    { key: 'gross', label: 'จำนวนเงิน', type: 'number' },
    { key: 'vat', label: 'VAT', type: 'calc', calc: { op: 'percent', a: 'gross', percent: 7 } },
    { key: 'wht', label: 'ภาษีหัก ณ ที่จ่าย', type: 'calc', calc: { op: 'whtRow', a: 'gross' } },
    { key: 'net', label: 'สุทธิ', type: 'calc', calc: { op: 'subtract', operands: ['gross', 'wht'] }, isTotal: true },
  ]
  const one = [row('ค่าบริการ', 1000, 3)]

  it('charges VAT ticked line by line on the amount before withholding, as on everything', () => {
    const all = taxSummary(taxSubtotal(cols, one), true, undefined, 0, taxBases(cols, one, {}))
    const ticked = [{ ...one[0], 'tax:vat': 1 }]
    const byLine = taxSummary(taxSubtotal(cols, ticked), true, undefined, 0, taxBases(cols, ticked, { vat: 'rows' }))
    expect(all.vatAmount).toBe(70)
    expect(byLine.vatAmount).toBe(70)
  })

  it('keeps whatever else the total column holds — a VAT column in it', () => {
    const withVat = vatCols.map(c => c.key === 'net' ? { ...c, calc: { op: 'add' as const, operands: ['gross', 'vat'] } } : c)
      .concat([{ key: 'pay', label: 'ยอดจ่าย', type: 'calc', calc: { op: 'subtract', operands: ['net', 'wht'] }, isTotal: true }])
      .map(c => c.key === 'net' ? { ...c, isTotal: false } : c)
    expect(grandTotal(withVat, one)).toBe(1040)                       // 1,000 + 70 − 30
    const tax = taxSummary(taxSubtotal(withVat, one), false, undefined, 0, taxBases(withVat, one, {}))
    expect(tax.netTotal).toBe(1040)
  })

  it('reads the withholding column marked as the total as the column it is charged on', () => {
    const odd = cols.map(c => ({ ...c, isTotal: c.key === 'wht' }))
    const tax = taxSummary(taxSubtotal(odd, one), false, undefined, 0, taxBases(odd, one, {}))
    expect(tax.subtotal).toBe(1000)
    expect(tax.netTotal).toBe(970)
  })

  it('lists each rate as the table took it, so the lines add up to the total', () => {
    const small = [row('a', 0.5, 3), row('b', 0.5, 3), row('c', 0.5, 5)]
    const bases = taxBases(cols, small, {})
    expect(bases.whtFixed).toBeGreaterThan(0)            // each line rounded on its own
    const lines = whtLines(bases)
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBeCloseTo(bases.whtFixed!, 9)
  })

  it('prints a summary explaining the withholding when the table\'s total is the amount before it', () => {
    const grossTotal = cols.map(c => ({ ...c, isTotal: c.key === 'gross' }))
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={one} docNumber="X" settings={{ ...settings, columns: grossTotal }} />)
    expect(container.textContent).toMatch(/หัก ณ ที่จ่าย \(ตามรายการ\)\s*-30\.00/)
  })
})

// A form given a withholding column after documents were saved on it.
describe('documents saved before their form worked withholding out in the table', () => {
  it('gives every line the document\'s rate when it was charged on everything', () => {
    const rows = adoptDocumentWht(cols, { whtRate: 3, whtScope: 'all' }, [{ detail: 'a', gross: 1000 }, { detail: 'b', gross: 500 }])
    expect(rows.map(r => r[ROW_WHT_RATE_KEY])).toEqual([3, 3])
    expect(grandTotal(cols, rows)).toBe(1455)
  })

  it('gives lines ticked before lines had rates the document\'s rate, and leaves the rest', () => {
    const rows = adoptDocumentWht(cols, { whtRate: 3, whtScope: 'rows' }, [
      { detail: 'a', gross: 1000, [ROW_WHT_KEY]: 1 }, { detail: 'b', gross: 500 }, { detail: 'c', gross: 200, [ROW_WHT_RATE_KEY]: 1 },
    ])
    expect(rows.map(r => r[ROW_WHT_RATE_KEY])).toEqual([3, undefined, 1])
  })

  it('leaves a document with no withholding, or a form without the column, alone', () => {
    const lines = [{ detail: 'a', gross: 1000 }]
    expect(adoptDocumentWht(cols, {}, lines)).toBe(lines)
    expect(adoptDocumentWht(cols.filter(c => c.key !== 'wht'), { whtRate: 3 }, lines)).toBe(lines)
  })
})
