import { describe, expect, it } from 'vitest'
import type { Submission } from '../types/schema'
import { applyFilters, emptyFilters } from './submissionFilter'

function sub(overrides: Partial<Submission>): Submission {
  return {
    id: 'sub-1',
    formType: 'expense-claim',
    docNumber: 'GAC-202609-0001',
    header: {
      subject: '',
      categories: [],
      companyId: 'globe',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      position: '',
      job: '',
    },
    items: [],
    totals: { columnTotals: {}, grandTotal: 0, amountInThaiText: '' },
    createdBy: 'uid-1',
    createdByEmployeeId: 'E001',
    createdAt: new Date('2026-09-01T08:00:00').getTime(),
    updatedAt: new Date('2026-09-01T08:00:00').getTime(),
    printCount: 0,
    lastPrintedAt: null,
    ...overrides,
  }
}

describe('applyFilters', () => {
  it('searches document number and form name, not employee name', () => {
    const rows = [sub({})]
    const lookups = { formGroup: () => 'expense-folder', formName: () => 'ใบเบิกค่าใช้จ่าย' }

    expect(applyFilters(rows, { ...emptyFilters, q: 'GAC-202609' }, lookups)).toHaveLength(1)
    expect(applyFilters(rows, { ...emptyFilters, q: 'ใบเบิกค่าใช้จ่าย' }, lookups)).toHaveLength(1)
    expect(applyFilters(rows, { ...emptyFilters, q: 'พนักงาน พีซี' }, lookups)).toHaveLength(0)
  })
})
