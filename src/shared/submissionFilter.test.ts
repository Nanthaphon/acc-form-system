import { describe, expect, it } from 'vitest'
import type { FormSettings, Submission } from '../types/schema'
import { applyFilters, emptyFilters, filterChoices } from './submissionFilter'

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

describe('filterChoices', () => {
  const groups = [
    { id: 'general', name: 'ทั่วไป', sortOrder: 0, createdAt: 0 },
    { id: 'dx', name: 'ฟอร์มเบิกค่าใช้จ่าย DX', sortOrder: 1, createdAt: 0 },
    { id: 'closed', name: 'ปิดอยู่', sortOrder: 2, createdAt: 0, active: false },
  ]
  const form = (formType: string, groupId: string | undefined, more: Partial<FormSettings> = {}) =>
    ({ formType, name: formType, groupId, ...more }) as FormSettings
  const forms = [
    form('refund', 'general'),
    form('dx-claim', 'dx', { accessGroups: ['dx'] }),
    form('old', 'closed'),
    form('paused', 'general', { active: false }),
    form('nofolder', undefined),                       // lives in the first folder
  ]

  it('offers only what the person may use, and only folders that hold some of it', () => {
    const c = filterChoices(forms, groups, { accessGroup: 'pcms', isAdmin: false })
    expect(c.forms.map(f => f.formType)).toEqual(['refund', 'nofolder'])
    expect(c.groups.map(g => g.id)).toEqual(['general'])
  })

  it('offers the folder of a form closed to everyone but the person\'s access group', () => {
    const c = filterChoices(forms, groups, { accessGroup: 'dx', isAdmin: false })
    expect(c.groups.map(g => g.id)).toEqual(['general', 'dx'])
  })

  it('still offers a form the person\'s own documents were made on', () => {
    const c = filterChoices(forms, groups, { accessGroup: 'pcms', isAdmin: false, usedFormTypes: ['dx-claim'] })
    expect(c.forms.map(f => f.formType)).toContain('dx-claim')
    expect(c.groups.map(g => g.id)).toContain('dx')
  })

  it('offers an admin everything', () => {
    const c = filterChoices(forms, groups, { isAdmin: true })
    expect(c.forms).toHaveLength(forms.length)
    expect(c.groups).toHaveLength(groups.length)
  })
})
