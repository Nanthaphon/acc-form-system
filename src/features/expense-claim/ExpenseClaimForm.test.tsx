import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import { EXPENSE_CLAIM_DEFAULT_COLUMNS, emptyRow } from '../../types/schema'

const header = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }

describe('ExpenseClaimForm', () => {
  it('แสดงตัวอักษรไทยจากรายการ (dynamic columns)', () => {
    const items = [{ ...emptyRow(EXPENSE_CLAIM_DEFAULT_COLUMNS), workDays: 27, ratePerDay: 500 }]
    render(
      <ExpenseClaimForm
        header={header}
        items={items}
        columns={EXPENSE_CLAIM_DEFAULT_COLUMNS}
        onHeaderChange={() => {}}
        onItemsChange={() => {}}
      />,
    )
    expect(screen.getByText('(หนึ่งหมื่นสามพันเก้าสิบห้าบาทถ้วน)')).toBeInTheDocument()
  })

  it('แสดงบรรทัด VAT 7% และหัก ณ ที่จ่าย 3% เมื่อติ๊ก', () => {
    const items = [{ ...emptyRow(EXPENSE_CLAIM_DEFAULT_COLUMNS), workDays: 27, ratePerDay: 500 }]
    render(
      <ExpenseClaimForm
        header={{ ...header, vat: true, whtRate: 3 }}
        items={items}
        columns={EXPENSE_CLAIM_DEFAULT_COLUMNS}
        onHeaderChange={() => {}}
        onItemsChange={() => {}}
      />,
    )
    expect(screen.getByText('ภาษีมูลค่าเพิ่ม 7%')).toBeInTheDocument()
    expect(screen.getByText('หัก ณ ที่จ่าย 3%')).toBeInTheDocument()
  })

  it('ช่องกรอกในข้อความ {{…}} บันทึกค่าลง header.fields', () => {
    const onHeaderChange = vi.fn()
    render(
      <ExpenseClaimForm
        header={header}
        items={[emptyRow(EXPENSE_CLAIM_DEFAULT_COLUMNS)]}
        columns={EXPENSE_CLAIM_DEFAULT_COLUMNS}
        onHeaderChange={onHeaderChange}
        onItemsChange={() => {}}
        bodyText="ได้รับเงินจาก {{ผู้จ่าย}} จำนวน {{ยอด:ตัวเลข}} บาท"
      />,
    )
    expect(screen.getByText('ข้อความในเอกสาร')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('ผู้จ่าย'), { target: { value: 'สมชาย' } })
    expect(onHeaderChange).toHaveBeenCalledWith(expect.objectContaining({ fields: { 'tpl:ผู้จ่าย': 'สมชาย' } }))
  })

  it('ไม่แสดงการ์ดข้อความ ถ้าข้อความไม่มีช่องกรอก', () => {
    render(
      <ExpenseClaimForm
        header={header}
        items={[emptyRow(EXPENSE_CLAIM_DEFAULT_COLUMNS)]}
        columns={EXPENSE_CLAIM_DEFAULT_COLUMNS}
        onHeaderChange={() => {}}
        onItemsChange={() => {}}
        introText="ข้อความธรรมดา ......"
      />,
    )
    expect(screen.queryByText('ข้อความในเอกสาร')).not.toBeInTheDocument()
  })
})
