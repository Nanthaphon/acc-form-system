import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExpenseClaimPreview from './ExpenseClaimPreview'
import type { Company, ExpenseHeader, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'

// The company picked at the top of the form and the document's total were
// typed a second time into the paragraph — and could disagree with the rest
// of the sheet. Automatic fields print them from the document itself.

const cols: FormColumn[] = [
  { key: 'detail', label: 'รายละเอียด', type: 'text' },
  { key: 'amount', label: 'จำนวนเงิน', type: 'number', isTotal: true },
]
const header: ExpenseHeader = { subject: '', categories: [], companyId: 'globe', firstName: 'สมชาย', lastName: 'ใจดี', position: 'IT', job: '' }
const globe: Company = { id: 'globe', name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', address: '' }
const settings: FormSettings = {
  ...EXPENSE_CLAIM_DEFAULTS, columns: cols,
  introText: '{{ชื่อบริษัท:อัตโนมัติ}} ได้รับเงินจาก {{ผู้จ่าย}}\nครบถ้วนตามจำนวนเงิน {{ยอดเงิน:อัตโนมัติ}} บาท ({{ยอดเงินตัวอักษร:อัตโนมัติ}})',
}

describe('automatic fields on the printed sheet', () => {
  it('print the company picked and the document total', () => {
    const { container } = render(<ExpenseClaimPreview company={globe} header={header} items={[{ detail: 'ค่าเดินทาง', amount: 1500 }]} docNumber="X" settings={settings} />)
    const intro = container.querySelector('.text-justify')!.textContent!
    expect(intro).toContain('บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด ได้รับเงินจาก')
    expect(intro).toContain('ครบถ้วนตามจำนวนเงิน 1,500.00 บาท (หนึ่งพันห้าร้อยบาทถ้วน)')
  })

  it('follow a change of company, with nothing typed', () => {
    render(<ExpenseClaimPreview company={{ ...globe, name: 'บริษัท เบสท์ เอช อาร์ เอ็ม จำกัด' }} header={header} items={[]} docNumber="X" settings={settings} />)
    expect(screen.getByText('บริษัท เบสท์ เอช อาร์ เอ็ม จำกัด')).toBeInTheDocument()
  })

  it('print dots while there is nothing to show, to be written by hand', () => {
    const { container } = render(<ExpenseClaimPreview company={null} header={header} items={[]} docNumber="X" settings={settings} />)
    const intro = container.querySelector('.text-justify')!.textContent!
    expect(intro).toMatch(/^\.{10,} ได้รับเงินจาก/)
    expect(intro).toMatch(/ครบถ้วนตามจำนวนเงิน \.{10,} บาท/)
  })
})
