import { describe, expect, it } from 'vitest'
import type { FormSettings } from '../types/schema'
import { filterAndSortForms } from './formSort'

const form = (name: string, createdAt: number, updatedAt: number, formCode = ''): FormSettings => ({
  formType: name, name, title: name, subject: '', attention: '', formCode,
  categories: [], notes: [], columns: [], createdAt, updatedAt,
})
const names = (fs: FormSettings[]) => fs.map(f => f.name)

const forms = [
  form('ใบเบิกเงินสดย่อย', 200, 900),
  form('ใบขอเบิกเงินทดรองจ่าย', 100, 300),
  form('แบบฟอร์มการอบรม', 300, 600, 'GACK769-006'),
]

describe('filterAndSortForms', () => {
  it('sorts by Thai name in both directions', () => {
    expect(names(filterAndSortForms(forms, '', 'name', 'asc'))).toEqual(['แบบฟอร์มการอบรม', 'ใบขอเบิกเงินทดรองจ่าย', 'ใบเบิกเงินสดย่อย'])
    expect(names(filterAndSortForms(forms, '', 'name', 'desc'))).toEqual(['ใบเบิกเงินสดย่อย', 'ใบขอเบิกเงินทดรองจ่าย', 'แบบฟอร์มการอบรม'])
  })

  it('sorts by created / modified date', () => {
    expect(names(filterAndSortForms(forms, '', 'createdAt', 'asc'))).toEqual(['ใบขอเบิกเงินทดรองจ่าย', 'ใบเบิกเงินสดย่อย', 'แบบฟอร์มการอบรม'])
    expect(names(filterAndSortForms(forms, '', 'updatedAt', 'desc'))).toEqual(['ใบเบิกเงินสดย่อย', 'แบบฟอร์มการอบรม', 'ใบขอเบิกเงินทดรองจ่าย'])
  })

  it('breaks date ties by name so the order is stable', () => {
    const tied = [form('ข', 5, 5), form('ก', 5, 5)]
    expect(names(filterAndSortForms(tied, '', 'createdAt', 'desc'))).toEqual(['ก', 'ข'])
  })

  it('filters by name or form code, case-insensitively', () => {
    expect(names(filterAndSortForms(forms, 'เบิก', 'name', 'asc'))).toEqual(['ใบขอเบิกเงินทดรองจ่าย', 'ใบเบิกเงินสดย่อย'])
    expect(names(filterAndSortForms(forms, 'gack769', 'name', 'asc'))).toEqual(['แบบฟอร์มการอบรม'])
  })

  it('does not mutate the input array', () => {
    const copy = [...forms]
    filterAndSortForms(forms, '', 'name', 'desc')
    expect(forms).toEqual(copy)
  })
})
