import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import type { ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const header = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: '', job: '' }
const settings: FormSettings = { ...EXPENSE_CLAIM_DEFAULTS, columns: cols, formCode: 'GAC69-005' }
const rows = (n: number): ExpenseRow[] => Array.from({ length: n }, (_, i) => ({ detail: `รายการ ${i + 1}`, amount: 100 }))
const created = new Date(2026, 9, 30, 9, 15).getTime()
const sheets = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('.doc-page')]

describe('the sheet\'s heading and foot', () => {
  it('prints the day the document was made beside the form code', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={rows(2)} docNumber="X" settings={settings} createdAt={created} />)
    expect(sheets(container)[0].textContent).toMatch(/วันที่ 30\/10\/2026\s*GAC69-005/)
  })

  it('prints no date where none is given', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={rows(2)} docNumber="X" settings={settings} />)
    expect(container.textContent).not.toMatch(/วันที่ \d/)
    expect(container.textContent).toContain('GAC69-005')
  })

  // The page number moved from beside the form code to the sheet's foot.
  it('numbers each sheet at its foot, after everything else on it', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={rows(40)} docNumber="X" settings={settings} createdAt={created} />)
    const pages = sheets(container)
    expect(pages.length).toBeGreaterThan(1)
    pages.forEach((p, i) => {
      expect(p.lastElementChild?.textContent).toBe(`หน้า ${i + 1} / ${pages.length}`)
      expect(p.firstElementChild?.textContent).not.toContain('หน้า ')
    })
  })

  it('numbers nothing on a single sheet', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={rows(2)} docNumber="X" settings={settings} />)
    expect(container.textContent).not.toMatch(/หน้า \d+ \//)
  })
})
