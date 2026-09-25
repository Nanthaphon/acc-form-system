import Papa from 'papaparse'
import type { Role } from '../types/schema'

export interface CsvEmployeeRow {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role; accessGroup?: string
  /** Where the row sits in the person's own file, header = 1. For messages. */
  line?: number
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
      line,
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

export interface ImportLists {
  companies: { id: string; name: string }[]
  groups: { id: string; name: string }[]
  departments: string[]
  positions: string[]
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Puts every row into the system's own spelling, and reports what it cannot
 * place — before anything is created, while the file can still be fixed.
 *
 * A company or group may be written as its code or as its name: the template's
 * group dropdown offers names, because a group made on screen has a code no
 * one could read. A department or position is checked only once that field
 * has a list; until then it is free text, as it has always been.
 *
 * An empty list is treated as "could not load", never as "nothing is allowed",
 * so a failed request cannot turn into every row being refused.
 */
export function checkAgainstLists(result: ParseResult, lists: ImportLists): ParseResult {
  const errors = [...result.errors]
  const where = (r: CsvEmployeeRow) => (r.line ? `บรรทัด ${r.line}` : `รหัส ${r.employeeId}`)

  const rows = result.rows.map(r => {
    const out = { ...r }

    if (lists.companies.length > 0 && out.companyId) {
      const c = lists.companies.find(x => same(x.id, out.companyId) || same(x.name, out.companyId))
      if (c) out.companyId = c.id
      else errors.push(`${where(r)}: ไม่พบบริษัท "${out.companyId}" ในระบบ`)
    }

    if (lists.groups.length > 0 && out.accessGroup) {
      const g = lists.groups.find(x => same(x.id, out.accessGroup!) || same(x.name, out.accessGroup!))
      if (g) out.accessGroup = g.id
      else errors.push(`${where(r)}: ไม่พบกลุ่ม "${out.accessGroup}" ในระบบ`)
    }

    for (const [field, list, label] of [
      ['department', lists.departments, 'แผนก'],
      ['position', lists.positions, 'ตำแหน่ง'],
    ] as const) {
      const typed = out[field]
      if (list.length === 0 || !typed) continue
      const hit = list.find(v => same(v, typed))
      if (hit) out[field] = hit
      else errors.push(`${where(r)}: ${label} "${typed}" ไม่อยู่ในรายการ — เพิ่มได้ที่เมนู Custom Field`)
    }

    return out
  })

  return { rows, errors }
}
