import { describe, it, expect } from 'vitest'
import type { FormColumn } from '../../types/schema'
import { fillColumnPercents, tableMinWidth, DATE_COL_MIN_PX } from './calc'

const col = (type: FormColumn['type'], width?: number): FormColumn =>
  ({ key: `k${width ?? 'x'}${type}`, label: 'l', type, width })
const pct = (s: string) => Number(s.replace('%', ''))

describe('fillColumnPercents', () => {
  it('splits the row the way the sheet will', () => {
    // One column left blank takes the slack, so the two fixed ones keep their ratio.
    const p = fillColumnPercents(10, [col('text', 40), col('text', 20), col('text')]).map(pct)
    expect(p[0] / p[1]).toBeCloseTo(2, 5) // 40mm reads twice as wide as 20mm
    expect(p[0] + p[1] + p[2]).toBeCloseTo(100, 2)
  })

  it('lets the last column take the slack when every width is set', () => {
    const p = fillColumnPercents(10, [col('text', 40), col('text', 20)]).map(pct)
    expect(p[1]).toBeGreaterThan(p[0]) // 20mm + everything left over
  })

  it('still fills the row when the widths would overflow the page', () => {
    // 3 × 200mm is far past A4; on screen it is still three equal columns.
    const p = fillColumnPercents(10, [col('number', 200), col('number', 200), col('number', 200)]).map(pct)
    expect(p[0]).toBeCloseTo(p[2], 3)
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2)
  })

  it('shares the row between the columns left blank', () => {
    const p = fillColumnPercents(10, [col('text', 100), col('text'), col('text')]).map(pct)
    expect(p[1]).toBeCloseTo(p[2], 3)
    expect(p[0]).toBeGreaterThan(p[1])
  })
})

describe('tableMinWidth', () => {
  // Only what a person needs to read and type counts — a wide setting is for paper.
  it('reserves a readable minimum per column, plus the # and delete columns', () => {
    expect(tableMinWidth([col('text'), col('number', 300)])).toBe(32 + 36 + 80 + 80)
  })
  it('gives a date column room for dd/mm/yyyy', () => {
    expect(tableMinWidth([col('date')])).toBe(32 + 36 + DATE_COL_MIN_PX)
  })
  it('is just the fixed columns when a form has none of its own', () => {
    expect(tableMinWidth([])).toBe(68)
  })
})
