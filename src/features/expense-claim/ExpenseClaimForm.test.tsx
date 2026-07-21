import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import { emptyItem } from '../../types/schema'

const header = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }

describe('ExpenseClaimForm', () => {
  it('แสดงยอดรวมและตัวอักษรไทยจากรายการ', () => {
    const items = [{ ...emptyItem(), workDays: 27, ratePerDay: 500 }]
    render(<ExpenseClaimForm header={header} items={items} onHeaderChange={() => {}} onItemsChange={() => {}} />)
    expect(screen.getByText('หนึ่งหมื่นสามพันเก้าสิบห้าบาทถ้วน')).toBeInTheDocument()
  })
})
