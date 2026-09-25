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

// The employee ID is also the first password, and Supabase refuses a password
// shorter than 6. An account for a shorter ID cannot be created at all — so it
// is reported here, with the rest of the file, rather than failing mid-import.
export const MIN_EMPLOYEE_ID = 6

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
  // The second of two rows with one ID would fail as already registered half
  // way through the import — say so now, pointing at both lines.
  const seenAt = new Map<string, number>()

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
    const id = clean(raw.employeeId)
    if (id && seenAt.has(id)) {
      errors.push(`บรรทัด ${line}: รหัสพนักงาน "${id}" ซ้ำกับบรรทัด ${seenAt.get(id)}`)
    } else if (id) {
      seenAt.set(id, line)
    }
    if (id && id.length < MIN_EMPLOYEE_ID) {
      errors.push(`บรรทัด ${line}: รหัสพนักงาน "${id}" สั้นเกินไป — ต้องยาวอย่างน้อย ${MIN_EMPLOYEE_ID} ตัว เพราะใช้เป็นรหัสผ่านเริ่มต้นด้วย`)
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
  companies: { id: string; name: string; shortName?: string | null }[]
  groups: { id: string; name: string }[]
  departments: string[]
  positions: string[]
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Puts every row into the system's own spelling, and reports what it cannot
 * place — before anything is created, while the file can still be fixed.
 *
 * A company may be written as its code, its short name or its full name, and
 * a group as its code or its name: the template offers the names, because
 * that is what people know them by. Both are stored as their code.
 *
 * แผนก and ตำแหน่ง are free text and never refused. When what was typed
 * matches a Custom Field value apart from case or spacing, it is stored in
 * the list's spelling, so "payroll " and "Payroll" do not become two departments.
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
      const c = lists.companies.find(x =>
        same(x.id, out.companyId) || same(x.name, out.companyId) || (!!x.shortName && same(x.shortName, out.companyId)))
      if (c) out.companyId = c.id
      else errors.push(`${where(r)}: ไม่พบบริษัท "${out.companyId}" ในระบบ`)
    }

    if (lists.groups.length > 0 && out.accessGroup) {
      const g = lists.groups.find(x => same(x.id, out.accessGroup!) || same(x.name, out.accessGroup!))
      if (g) out.accessGroup = g.id
      else errors.push(`${where(r)}: ไม่พบกลุ่ม "${out.accessGroup}" ในระบบ`)
    }

    for (const [field, list] of [['department', lists.departments], ['position', lists.positions]] as const) {
      const hit = out[field] ? list.find(v => same(v, out[field])) : undefined
      if (hit) out[field] = hit
    }

    return out
  })

  return { rows, errors }
}
