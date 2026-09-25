import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readSheet, readPart, isXlsx } from './xlsx'
import { parseEmployeeGrid } from './csv'
import { buildEmployeeTemplate } from './employeeTemplate'
import type { TemplateLists } from './employeeTemplate'

// Lists shaped like the real system's. A group made on screen has a random
// code, which is why the template offers group names; a company is offered
// by the short name people know it by.
const LISTS: TemplateLists = {
  companies: [
    { id: 'globe', name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', shortName: 'Globe Syndicate' },
    { id: 'besthrm', name: 'บริษัท เบสท์ เอช อาร์ เอ็ม จำกัด', shortName: 'Besthrm' },
  ],
  groups: [
    { id: 'pcms', name: 'PcMs' },
    { id: '80da51c6-06bb-4d7c-8eba-c8b227bccc39', name: 'HR' },
    { id: '9d1c', name: 'ฝ่ายขาย' },
  ],
}

const build = async (lists: TemplateLists = LISTS) => {
  const bytes = await buildEmployeeTemplate(lists)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

// The template after Microsoft Excel opened, filled in and re-saved it.
// Excel lays a workbook out differently from anything we write — different
// zip entries, different extra fields, its own shared-string table — and
// Excel's version is the one that will actually be uploaded. A reader that
// only ever meets files from its own writer has not been tested.
const EXCEL = join(__dirname, '__fixtures__', 'written-by-excel.xlsx')
const writtenByExcel = () => {
  const file = readFileSync(EXCEL)
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
}

const HEADERS = [
  'employeeId', 'firstName', 'lastName', 'companyId', 'position',
  'department', 'defaultJob', 'bankAccount', 'role', 'accessGroup',
]

describe('the template, as built from the live lists', () => {
  it('has the headers the importer reads', async () => {
    expect((await readSheet(await build(), 'พนักงาน'))[0]).toEqual(HEADERS)
  })

  it('ships empty, with nothing to remember to delete', async () => {
    const { rows, errors } = parseEmployeeGrid(await readSheet(await build(), 'พนักงาน'))
    expect(rows).toEqual([])
    expect(errors).toEqual([])
  })

  // One sheet to fill in and nothing else in the tab bar. The dropdowns still
  // need their values somewhere in the file, so those sit on a hidden sheet.
  it('shows one sheet, keeping the dropdown values on a hidden one', async () => {
    const book = await readPart(await build(), 'xl/workbook.xml')
    const sheets = [...book.matchAll(/<sheet name="([^"]+)"([^>]*)\/>/g)].map(m => [m[1], m[2].includes('state="hidden"')])
    expect(sheets).toEqual([['พนักงาน', false], ['ตัวเลือก', true]])
  })

  it('offers companies by the name people know them by', async () => {
    const options = await readSheet(await build(), 'ตัวเลือก')
    expect(options[0]).toEqual(['role', 'companyId', 'accessGroup'])
    expect(options.slice(1).map(r => r[1]).filter(Boolean)).toEqual(['Globe Syndicate', 'Besthrm'])
    expect(options.slice(1).map(r => r[2]).filter(Boolean)).toEqual(['PcMs', 'HR', 'ฝ่ายขาย'])
  })

  it('falls back to the code for a company with no short name yet', async () => {
    const options = await readSheet(await build({ ...LISTS, companies: [{ id: 'globe', name: 'x' }] }), 'ตัวเลือก')
    expect(options[1][1]).toBe('globe')
  })

  it('gives role, company and group a dropdown — and แผนก and ตำแหน่ง none', async () => {
    const xml = await readPart(await build(), 'xl/worksheets/sheet1.xml')
    const lists = Object.fromEntries([...xml.matchAll(/sqref="([A-Z]+)2:[A-Z]+1000"><formula1>([^<]+)<\/formula1>/g)].map(m => [m[1], m[2]]))
    expect(lists.I).toBe("'ตัวเลือก'!$A$2:$A$3")   // role
    expect(lists.D).toBe("'ตัวเลือก'!$B$2:$B$3")   // companyId
    expect(lists.J).toBe("'ตัวเลือก'!$C$2:$C$4")   // accessGroup
    expect(lists.E).toBeUndefined()                    // position
    expect(lists.F).toBeUndefined()                    // department
  })

  it('refuses a wrong role outright, but only warns on lists that can grow', async () => {
    const xml = await readPart(await build(), 'xl/worksheets/sheet1.xml')
    const rule = (col: string) => new RegExp(`<dataValidation[^>]*sqref="${col}2:${col}1000"`).exec(xml)?.[0] ?? ''
    expect(rule('I')).not.toContain('errorStyle')          // role: the default, stop
    expect(rule('D')).toContain('errorStyle="warning"')    // companyId
    expect(rule('A')).toContain('type="textLength"')       // employeeId, 6+
  })

  it('keeps the digit columns as text, so Excel cannot eat a leading zero', async () => {
    const xml = await readPart(await build(), 'xl/worksheets/sheet1.xml')
    const styles = await readPart(await build(), 'xl/styles.xml')
    const styleOf = (col: number) => Number(new RegExp(`<col min="${col}" max="${col}"[^>]*style="(\\d+)"`).exec(xml)?.[1])
    const xfs = [...styles.matchAll(/<xf numFmtId="(\d+)"[^>]*xfId/g)].map(m => m[1])
    expect(xfs[styleOf(1)]).toBe('49') // employeeId
    expect(xfs[styleOf(8)]).toBe('49') // bankAccount
  })

  it('builds the same bytes from the same lists', async () => {
    const [a, b] = await Promise.all([build(), build()])
    expect(new Uint8Array(a)).toEqual(new Uint8Array(b))
  })
})

describe('reading an .xlsx', () => {
  it('reads Thai text, which is where a wrong decoder would show up first', async () => {
    const options = await readSheet(await build(), 'ตัวเลือก')
    expect(options.flat()).toContain('ฝ่ายขาย')
  })

  it('reads a workbook Excel itself wrote, which is the one people will upload', async () => {
    const { rows, errors } = parseEmployeeGrid(await readSheet(writtenByExcel(), 'พนักงาน'))
    expect(errors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      employeeId: '1020001', firstName: 'สมหญิง', lastName: 'รักงาน',
      companyId: 'globe', position: 'ผู้จัดการฝ่ายบัญชี', department: 'Finance',
      defaultJob: 'ปิดงบรายเดือน', bankAccount: '987-6-54321-0', role: 'admin',
    })
  })

  // An employee id is a string of digits, not a quantity. Left as a number it
  // would lose a leading zero and a long bank account would come back as
  // 9.87654E+11, so the template sets both columns to text.
  it('keeps digits as digits through Excel, rather than as numbers', async () => {
    const grid = await readSheet(writtenByExcel(), 'พนักงาน')
    expect(grid[1][0]).toBe('1020001')
    expect(grid[1][7]).toBe('987-6-54321-0')
  })

  it('refuses a file that is not a workbook at all', async () => {
    const notAZip = new TextEncoder().encode('employeeId,firstName\n1010999,สมชาย')
    await expect(readSheet(notAZip.buffer as ArrayBuffer)).rejects.toThrow(/ไม่ใช่ไฟล์ Excel/)
  })

  it('knows which files to hand to this reader', () => {
    const named = (name: string) => ({ name }) as File
    expect(isXlsx(named('พนักงาน.xlsx'))).toBe(true)
    expect(isXlsx(named('EMPLOYEES.XLSX'))).toBe(true)
    expect(isXlsx(named('employees.csv'))).toBe(false)
  })
})

describe('turning the grid into employees', () => {
  // The guard stays for the copies of the old template already downloaded.
  it('still refuses the old template\'s example row', () => {
    const { rows, errors } = parseEmployeeGrid([
      ['employeeId', 'firstName', 'lastName', 'companyId'],
      ['1010999', 'สมชาย', 'ใจดี', 'globe'],
    ])
    expect(rows).toEqual([])
    expect(errors).toEqual([expect.stringContaining('แถวตัวอย่าง')])
  })

  it('reads a filled-in row by header name, whatever order the columns are in', () => {
    const shuffled = [
      ['role', 'employeeId', 'lastName', 'companyId', 'firstName'],
      ['admin', '1010001', 'ใจดี', 'globe', 'สมหญิง'],
    ]
    const { rows, errors } = parseEmployeeGrid(shuffled)
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ employeeId: '1010001', firstName: 'สมหญิง', role: 'admin', line: 2 })
  })

  it('says which headers are missing rather than importing blanks', () => {
    const { rows, errors } = parseEmployeeGrid([['firstName', 'lastName'], ['สมชาย', 'ใจดี']])
    expect(rows).toHaveLength(0)
    expect(errors[0]).toContain('employeeId')
    expect(errors[0]).toContain('companyId')
  })
})
