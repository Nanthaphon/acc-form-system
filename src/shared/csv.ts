import Papa from 'papaparse'
import type { Role } from '../types/schema'

export interface CsvEmployeeRow {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role; accessGroup?: string
}

export interface ParseResult { rows: CsvEmployeeRow[]; errors: string[] }

const REQUIRED = ['employeeId', 'firstName', 'lastName', 'companyId'] as const

// The example row shipped in the template. Left in, it would create a real
// employee called สมชาย ใจดี — so it is refused by name rather than dropped
// quietly, which would be the same surprise in the other direction.
const EXAMPLE_ID = '1010999'

const clean = (v: unknown) => String(v ?? '').trim()

/**
 * Shared by both file formats: a row is a plain header-to-value record,
 * however it was read, and every rule about what may be in it lives here.
 *
 * `line` is what the person will see in their own spreadsheet or text editor,
 * so it counts the header as line 1.
 */
function rowsFromRecords(records: Record<string, string>[], firstLine = 2): ParseResult {
  const rows: CsvEmployeeRow[] = []
  const errors: string[] = []

  records.forEach((raw, idx) => {
    const line = idx + firstLine
    const values = Object.values(raw).map(clean)
    if (values.every(v => v === '')) return // a blank row is not a mistake

    if (clean(raw.employeeId) === EXAMPLE_ID) {
      errors.push(`บรรทัด ${line}: นี่คือแถวตัวอย่างที่มากับไฟล์ — ลบทั้งแถวออกก่อนนำเข้า`)
      return
    }
    for (const field of REQUIRED) {
      if (!clean(raw[field])) errors.push(`บรรทัด ${line}: ขาดค่า ${field}`)
    }
    const role = clean(raw.role) || 'employee'
    if (role !== 'employee' && role !== 'admin') {
      errors.push(`บรรทัด ${line}: role ต้องเป็น employee หรือ admin`)
    }
    rows.push({
      employeeId: clean(raw.employeeId),
      firstName: clean(raw.firstName),
      lastName: clean(raw.lastName),
      position: clean(raw.position),
      department: clean(raw.department),
      companyId: clean(raw.companyId),
      defaultJob: clean(raw.defaultJob),
      bankAccount: clean(raw.bankAccount),
      role: (role === 'admin' ? 'admin' : 'employee') as Role,
      accessGroup: clean(raw.accessGroup) || undefined,
    })
  })

  return { rows, errors }
}

export function parseEmployeeCsv(text: string): ParseResult {
  // Excel's "CSV UTF-8" adds a byte-order mark; left in, it glues onto the first
  // header ("﻿employeeId") and every row reports employeeId as missing.
  const stripped = text.replace(/^﻿/, '').trim()
  const parsed = Papa.parse<Record<string, string>>(stripped, { header: true, skipEmptyLines: true })
  return rowsFromRecords(parsed.data)
}

/**
 * The same employees, read from the grid of an .xlsx sheet.
 *
 * Columns are matched by the header text rather than by position, so a person
 * who reorders or inserts a column still gets their data read correctly — and
 * one who renames a header gets told, instead of a file that imports blanks.
 */
export function parseEmployeeGrid(grid: string[][]): ParseResult {
  const header = (grid[0] ?? []).map(clean)
  if (header.length === 0) return { rows: [], errors: ['ไม่พบหัวคอลัมน์ในแถวแรกของไฟล์'] }

  const missing = REQUIRED.filter(f => !header.includes(f))
  if (missing.length > 0) {
    return { rows: [], errors: [`หัวคอลัมน์ไม่ครบ: ขาด ${missing.join(', ')} — อย่าแก้ชื่อในแถวแรก`] }
  }

  const records = grid.slice(1).map(cells => {
    const record: Record<string, string> = {}
    header.forEach((name, i) => { if (name) record[name] = clean(cells[i]) })
    return record
  })
  return rowsFromRecords(records)
}
