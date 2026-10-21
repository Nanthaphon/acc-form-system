import { describe, it, expect } from 'vitest'
import type { FormColumn } from '../../types/schema'
import { fillColumnPx, fillTableLayout, withDocWidths, resizeColumns, screenPxToMm, MIN_COL_MM, PX_PER_MM, SCREEN_PER_PRINT, ACTION_COL_PX, DATE_COL_MIN_PX, rowLines, paginateRows, sheetOverheadMm, PRINT_SHEET_MM, printBodyMm, rowHeightMm } from './calc'

const col = (type: FormColumn['type'], width?: number): FormColumn =>
  ({ key: `k${width ?? 'x'}${type}`, label: 'l', type, width })

// The fill-in table is drawn at the size the sheet prints, so text wraps on
// screen where it will on paper.
describe('fillTableLayout', () => {
  it('draws each column as wide as it prints, at the screen\'s larger text', () => {
    const { cols, mm } = fillTableLayout(10, [col('text', 60), col('number', 30), col('text')])
    expect(mm[0]).toBe(60)
    expect(cols[0]).toBe(fillColumnPx(60))
    // what holds the text grows by exactly the screen-to-paper ratio
    expect((cols[0] - cols[1]) / ((60 - 30) * PX_PER_MM)).toBeCloseTo(SCREEN_PER_PRINT, 2)
  })

  it('takes the width the sheet gives a column left blank', () => {
    const { mm } = fillTableLayout(10, [col('text', 60), col('text')])
    expect(mm[1]).toBe(120)   // 190 − 10 − 60
  })

  it('draws a form set wider than the page at the size it is scaled to print at', () => {
    const { mm } = fillTableLayout(0, [col('number', 200), col('number', 200)])
    expect(mm).toEqual([95, 95])
  })

  it('still gives a date box room for dd/mm/yyyy', () => {
    expect(fillTableLayout(10, [col('date', 10), col('text')]).cols[0]).toBe(DATE_COL_MIN_PX)
  })

  // The delete button is 32px with room round it; at 36px it spilled out of
  // its cell and was cut off at the edge of the table.
  it('gives the delete column room for its button', () => {
    expect(ACTION_COL_PX).toBeGreaterThanOrEqual(48)
  })
})

describe('dragging a column edge', () => {
  it('widens one column by what the next gives up, so the sheet keeps its width', () => {
    const out = resizeColumns([40, 60, 90], 0, 15)
    expect(out).toEqual([55, 45, 90])
    expect(out.reduce((a, b) => a + b, 0)).toBe(190)
  })

  it('stops a column at its narrowest either way', () => {
    expect(resizeColumns([40, 60], 0, 500)).toEqual([100 - MIN_COL_MM, MIN_COL_MM])
    expect(resizeColumns([40, 60], 0, -500)).toEqual([MIN_COL_MM, 100 - MIN_COL_MM])
  })

  it('turns screen pixels into printed millimetres', () => {
    expect(screenPxToMm(PX_PER_MM * SCREEN_PER_PRINT * 10)).toBeCloseTo(10, 6)
  })

  it('prints a document\'s own widths over the form\'s, and the form\'s where it has none', () => {
    const cols = [{ ...col('text', 40), key: 'a' }, { ...col('text', 60), key: 'b' }]
    expect(withDocWidths(cols, { a: 70 }).map(c => c.width)).toEqual([70, 60])
    expect(withDocWidths(cols, undefined)).toBe(cols)
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
