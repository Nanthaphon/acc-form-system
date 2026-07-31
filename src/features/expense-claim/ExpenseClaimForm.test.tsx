import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    expect(screen.getByText('หนึ่งหมื่นสามพันเก้าสิบห้าบาทถ้วน')).toBeInTheDocument()
  })
})
