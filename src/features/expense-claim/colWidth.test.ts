import { describe, it, expect } from 'vitest'
import type { FormColumn } from '../../types/schema'
import { colWidth, tableMinWidth, DATE_COL_MIN_PX } from './calc'

const col = (type: FormColumn['type'], width?: number): FormColumn =>
  ({ key: 'k', label: 'l', type, width })

describe('colWidth', () => {
  it('lets a column with no width flex', () => {
    expect(colWidth(col('text'))).toBeUndefined()
    expect(colWidth(col('number'))).toBeUndefined()
  })
  it('keeps an explicit width', () => {
    expect(colWidth(col('text', 200))).toBe(200)
  })
  it('gives a date column a floor so dd/mm/yyyy always fits', () => {
    expect(colWidth(col('date'))).toBe(DATE_COL_MIN_PX)
    expect(colWidth(col('date', 60))).toBe(DATE_COL_MIN_PX)
  })
  it('still honours a date width that is wide enough', () => {
    expect(colWidth(col('date', 200))).toBe(200)
  })
})

describe('tableMinWidth', () => {
  it('sums the columns plus the # and delete columns', () => {
    // 32 + 36 + (80 default + 120 explicit) = 268
    expect(tableMinWidth([col('text'), col('number', 120)])).toBe(268)
  })
  it('reserves the full date width', () => {
    expect(tableMinWidth([col('date')])).toBe(32 + 36 + DATE_COL_MIN_PX)
  })
  it('is just the fixed columns when a form has none of its own', () => {
    expect(tableMinWidth([])).toBe(68)
  })
})
