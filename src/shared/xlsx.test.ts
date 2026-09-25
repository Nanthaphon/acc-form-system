import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readSheet, isXlsx } from './xlsx'
import { parseEmployeeGrid } from './csv'

// The fixture is the template the app actually hands out. Reading it here means
// the two can never drift apart: change the workbook in a way this reader
// cannot follow, and the test that fails is this one — not an admin's import.
const TEMPLATE = join(__dirname, '..', '..', 'public', 'employees-template.xlsx')
const template = () => {
  const file = readFileSync(TEMPLATE)
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
}

// The same template after Microsoft Excel opened, filled in and re-saved it.
// Excel lays a workbook out differently from the library that generated ours —
// different zip entries, different extra fields, its own shared-string table —
// and Excel's version is the one that will actually be uploaded. A reader that
// only ever meets files from its own generator has not been tested.
const EXCEL = join(__dirname, '__fixtures__', 'written-by-excel.xlsx')
const writtenByExcel = () => {
  const file = readFileSync(EXCEL)
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
}

const HEADERS = [
  'employeeId', 'firstName', 'lastName', 'companyId', 'position',
  'department', 'defaultJob', 'bankAccount', 'role', 'accessGroup',
]

describe('reading an .xlsx', () => {
  it('reads the headers out of the template the app gives people', async () => {
    const grid = await readSheet(template(), 'พนักงาน')
    expect(grid[0]).toEqual(HEADERS)
  })

  it('reads Thai text, which is where a wrong decoder would show up first', async () => {
    const grid = await readSheet(template(), 'พนักงาน')
    expect(grid[1]).toEqual([
      '1010999', 'สมชาย', 'ใจดี', 'globe', 'เจ้าหน้าที่บัญชี',
      'Payroll', 'งานบัญชีทั่วไป', '123-4-56789-0', 'employee', '',
    ])
  })

  it('reads the named sheet, not whichever one happens to be first', async () => {
    const help = await readSheet(template(), 'คำอธิบาย')
    expect(help[0]?.[0]).toBe('วิธีใช้ไฟล์นี้')
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

describe('the template, read end to end', () => {
  it('stops the example row from becoming a real employee', async () => {
    const { rows, errors } = parseEmployeeGrid(await readSheet(template(), 'พนักงาน'))
    expect(rows).toHaveLength(0)
    expect(errors).toEqual([expect.stringContaining('แถวตัวอย่าง')])
  })

  it('ignores the hundreds of styled but empty rows the template carries', async () => {
    const grid = await readSheet(template(), 'พนักงาน')
    expect(grid.length).toBeGreaterThan(100) // the rows are really there
    const { errors } = parseEmployeeGrid(grid)
    expect(errors.filter(e => e.includes('ขาดค่า'))).toEqual([])
  })

  it('reads a filled-in row by header name, whatever order the columns are in', () => {
    const shuffled = [
      ['role', 'employeeId', 'lastName', 'companyId', 'firstName'],
      ['admin', '1010001', 'ใจดี', 'globe', 'สมหญิง'],
    ]
    const { rows, errors } = parseEmployeeGrid(shuffled)
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ employeeId: '1010001', firstName: 'สมหญิง', role: 'admin' })
  })

  it('reads a workbook Excel itself wrote, which is the one people will upload', async () => {
    const { rows, errors } = parseEmployeeGrid(await readSheet(writtenByExcel(), 'พนักงาน'))
    expect(errors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      employeeId: '1020001', firstName: 'สมหญิง', lastName: 'รักงาน',
      companyId: 'globe', position: 'ผู้จัดการฝ่ายบัญชี', department: 'Finance',
      defaultJob: 'ปิดงบรายเดือน', bankAccount: '987-6-54321-0',
      role: 'admin', accessGroup: undefined,
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

  it('says which headers are missing rather than importing blanks', () => {
    const { rows, errors } = parseEmployeeGrid([['firstName', 'lastName'], ['สมชาย', 'ใจดี']])
    expect(rows).toHaveLength(0)
    expect(errors[0]).toContain('employeeId')
    expect(errors[0]).toContain('companyId')
  })
})
