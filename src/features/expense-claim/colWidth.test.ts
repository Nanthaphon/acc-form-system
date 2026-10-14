import { describe, it, expect } from 'vitest'
import type { FormColumn } from '../../types/schema'
import { fillColumnPercents, tableMinWidth, ACTION_COL_PX, TICK_COL_PX, DATE_COL_MIN_PX, rowLines, paginateRows, sheetOverheadMm, PRINT_SHEET_MM, printBodyMm, rowHeightMm } from './calc'

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
    expect(tableMinWidth([col('text'), col('number', 300)])).toBe(32 + 48 + 80 + 80)
  })
  it('gives a date column room for dd/mm/yyyy', () => {
    expect(tableMinWidth([col('date')])).toBe(32 + 48 + DATE_COL_MIN_PX)
  })
  it('is just the fixed columns when a form has none of its own', () => {
    expect(tableMinWidth([])).toBe(80)
  })
  // The delete button is 32px with room round it; at 36px it spilled out of
  // its cell and was cut off at the edge of the table.
  it('gives the delete column room for its button', () => {
    expect(ACTION_COL_PX).toBeGreaterThanOrEqual(48)
  })
  // Columns a tax is picked in take their width too, or the rest are squeezed
  // until the last column falls off the edge.
  it('counts the columns a tax is picked in', () => {
    expect(tableMinWidth([col('text')], 1, 2)).toBe(32 + 48 + 80 + 2 * TICK_COL_PX)
  })
})

describe('rowLines', () => {
  it('a row whose cells all fit on one line takes one', () => {
    expect(rowLines([30, 60], ['05/10/2026', 'ค่าแท็กซี่'])).toBe(1)
  })

  it('counts the lines a long detail wraps onto — the tallest cell decides', () => {
    // 60mm holds about 27 Thai characters a line, so 90 of them need four.
    expect(rowLines([30, 60], ['05/10/2026', 'ก'.repeat(90)])).toBe(4)
  })

  it('counts Latin text as narrower than Thai, as it prints', () => {
    // The same 40 characters: Thai wraps onto two lines in 37mm, Latin fits one.
    expect(rowLines([37], ['ก'.repeat(40)])).toBe(3)
    expect(rowLines([37], ['A'.repeat(40)])).toBe(2)
    expect(rowLines([20], ['05/10/2026'])).toBe(1)
  })

  // Thai vowels and tone marks print above or below the letter and take no width
  // of their own. Counting them made every detail look a line longer than it is.
  it('does not count the marks above and below a Thai letter', () => {
    expect(rowLines([37], ['ที่'])).toBe(1)
    // 'เงินช่วยเหลือ' is 13 characters but only 10 of them take any width
    expect(rowLines([24], ['เงินช่วยเหลือ'])).toBe(1)
  })

  // Each of these was measured on the printed sheet. The estimate must never
  // come out UNDER what prints, and should rarely come out more than one over.
  it.each([
    ['เงินช่วยเหลือพิธีพราหมณ์ สถานการณ์น้ำท่วม เมื่อวันที่ 28/09/69', 37, 3],
    ['โรงแรมอีเล็กซ์ค่าที่พัก ค่าที่พัก วันที่ 05-08/10/2569 รวม 3 คืน', 37, 2],
    ['บจก.แอดริติค ค่าผลิตสติ๊กเกอร์ไดคัทตามแบบ สำหรับติดตั้งงานผนังบูธ Samsung AV', 37, 3],
    ['ค่ารถเช่า ค่าเช่ารถ 05-10/10/69', 37, 2],
    ['เงินช่วยเหลือพิธีพราหมณ์ สถานการณ์น้ำท่วม เมื่อวันที่ 28/09/69 รายการที่ 1', 59.1, 2],
    ['05/10/2026', 20, 1],
    ['เงินช่วยเหลือชีพ', 17, 2],
    ['ค่าเช่ารถ', 17, 1],
  ])('matches the sheet within a line: %s', (text, width, printed) => {
    const est = rowLines([width as number], [text as string])
    expect(est).toBeGreaterThanOrEqual(printed as number)
    expect(est).toBeLessThanOrEqual((printed as number) + 1)
  })

  it('counts a line break the admin typed into the text', () => {
    expect(rowLines([60], ['บรรทัดหนึ่ง\nบรรทัดสอง\nบรรทัดสาม'])).toBe(3)
  })

  it('an empty row still takes its one line', () => {
    expect(rowLines([30, 60], ['', ''])).toBe(1)
  })
})

describe('rowHeightMm', () => {
  // Measured on the printed sheet: a row with one line of text is 6.6mm, two
  // lines 11.9mm, three 17.2mm — each line costs the same, and the row itself
  // costs once. Budgeting in "lines" alone cannot express that.
  it('matches the row heights measured on the sheet', () => {
    expect(rowHeightMm(1)).toBeCloseTo(6.6, 1)
    expect(rowHeightMm(2)).toBeCloseTo(11.9, 1)
    expect(rowHeightMm(3)).toBeCloseTo(17.2, 1)
  })
})

describe('paginateRows', () => {
  it('fills a sheet by how tall its rows print, not by how many they are', () => {
    // Four 17mm rows fill a 70mm sheet; the fifth starts the next one.
    const pages = paginateRows([17, 17, 17, 17, 17], 70)
    expect(pages.map(p => p.rows)).toEqual([[0, 1, 2, 3], [4]])
    expect(pages[0].usedMm).toBe(68)
  })

  it('fits more short rows than tall ones on the same sheet', () => {
    const short = paginateRows(Array(20).fill(rowHeightMm(1)), 70)
    const tall = paginateRows(Array(20).fill(rowHeightMm(3)), 70)
    expect(short[0].rows.length).toBeGreaterThan(tall[0].rows.length)
    expect(short[0].rows).toHaveLength(10)   // 70mm / 6.6mm
    expect(tall[0].rows).toHaveLength(4)     // 70mm / 17.2mm
  })

  it('a row taller than a whole sheet still gets one of its own', () => {
    const pages = paginateRows([6, 300, 6], 70)
    expect(pages.map(p => p.rows)).toEqual([[0], [1], [2]])
  })

  it('an empty document is one empty sheet', () => {
    expect(paginateRows([], 70)).toEqual([{ rows: [], usedMm: 0 }])
  })
})

describe('printLineBudget', () => {
  // Measured off a printed sheet: this form leaves 148mm for its rows, which is
  // room for about 22 lines. The estimate must land under that, never over.
  const gac69005 = {
    categoryRows: 2, showRequester: true, headerFields: 2, headLines: 2,
    taxLines: 4, showAmountWords: true, signatureRows: 2, noteLines: 5,
  }

  it('matches the room the sheet really has', () => {
    // Measured on the printed sheet: this form spends 191.5mm of the 276mm,
    // leaving 84.5mm of rows. The estimate may be a little under, never over.
    expect(sheetOverheadMm(gac69005)).toBeGreaterThanOrEqual(185)
    expect(sheetOverheadMm(gac69005)).toBeLessThanOrEqual(200)
    expect(printBodyMm(gac69005)).toBeGreaterThanOrEqual(70)
    expect(printBodyMm(gac69005)).toBeLessThanOrEqual(84.5)
  })

  it('holds the four rows of the real document on one sheet', () => {
    // The document in the report: details wrapping onto 3, 2, 3 and 2 lines.
    const heights = [3, 2, 3, 2].map(rowHeightMm)
    expect(paginateRows(heights, printBodyMm(gac69005))).toHaveLength(1)
  })

  it('keeps the whole sheet within A4', () => {
    expect(sheetOverheadMm(gac69005) + printBodyMm(gac69005)).toBeLessThanOrEqual(PRINT_SHEET_MM)
  })

  it('a bare form — no categories, notes or paragraphs — fits many more rows', () => {
    expect(printBodyMm({ headLines: 1, signatureRows: 1 })).toBeGreaterThan(printBodyMm(gac69005))
  })

  it('a form heavy with text around the table gets fewer', () => {
    const heavy = { ...gac69005, introLines: 4, bodyLines: 4, signatureRows: 2, noteLines: 9 }
    expect(printBodyMm(heavy)).toBeLessThan(printBodyMm(gac69005))
  })

  it('never falls below one row, however crowded the form', () => {
    const crowded = { introLines: 40, bodyLines: 40, signatureRows: 6, noteLines: 20 }
    expect(printBodyMm(crowded)).toBe(rowHeightMm(1))
    expect(paginateRows([rowHeightMm(1)], printBodyMm(crowded))).toHaveLength(1)
  })
})
