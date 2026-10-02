import { describe, it, expect } from 'vitest'
import type { FormColumn } from '../../types/schema'
import { colWidth, tableMinWidth, DATE_COL_MIN_PX, PX_PER_MM } from './calc'

const col = (type: FormColumn['type'], width?: number): FormColumn =>
  ({ key: 'k', label: 'l', type, width })
// A width is millimetres of paper; on screen it is drawn at 96dpi.
const px = (mm: number) => Math.round(mm * PX_PER_MM)

describe('colWidth', () => {
  it('lets a column with no width flex', () => {
    expect(colWidth(col('text'))).toBeUndefined()
    expect(colWidth(col('number'))).toBeUndefined()
  })
  it('draws an explicit width at its paper size', () => {
    expect(colWidth(col('text', 50))).toBe(px(50))
  })
  it('gives a date column a floor so dd/mm/yyyy always fits', () => {
    expect(colWidth(col('date'))).toBe(DATE_COL_MIN_PX)
    expect(colWidth(col('date', 15))).toBe(DATE_COL_MIN_PX) // 15mm ≈ 57px, too narrow
  })
  it('still honours a date width that is wide enough', () => {
    expect(colWidth(col('date', 50))).toBe(px(50))
  })
})

describe('tableMinWidth', () => {
  it('sums the columns plus the # and delete columns', () => {
    expect(tableMinWidth([col('text'), col('number', 30)])).toBe(32 + 36 + 80 + px(30))
  })
  it('reserves the full date width', () => {
    expect(tableMinWidth([col('date')])).toBe(32 + 36 + DATE_COL_MIN_PX)
  })
  it('is just the fixed columns when a form has none of its own', () => {
    expect(tableMinWidth([])).toBe(68)
  })
})
