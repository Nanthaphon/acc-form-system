import Papa from 'papaparse'
import type { Role } from '../types/schema'

export interface CsvEmployeeRow {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role; accessGroup?: string
}

const REQUIRED = ['employeeId', 'firstName', 'lastName', 'companyId'] as const

export function parseEmployeeCsv(text: string): { rows: CsvEmployeeRow[]; errors: string[] } {
  // Excel's "CSV UTF-8" adds a byte-order mark; left in, it glues onto the first
  // header ("\uFEFFemployeeId") and every row reports employeeId as missing.
  const clean = text.replace(/^\uFEFF/, '').trim()
  const parsed = Papa.parse<Record<string, string>>(clean, { header: true, skipEmptyLines: true })
  const rows: CsvEmployeeRow[] = []
  const errors: string[] = []
  parsed.data.forEach((raw, idx) => {
    const line = idx + 2 // +1 header +1 1-based
    for (const f of REQUIRED) {
      if (!raw[f] || !raw[f].trim()) errors.push(`บรรทัด ${line}: ขาดค่า ${f}`)
    }
    const role = (raw.role || 'employee').trim()
    if (role !== 'employee' && role !== 'admin') {
      errors.push(`บรรทัด ${line}: role ต้องเป็น employee หรือ admin`)
    }
    rows.push({
      employeeId: (raw.employeeId || '').trim(),
      firstName: (raw.firstName || '').trim(),
      lastName: (raw.lastName || '').trim(),
      position: (raw.position || '').trim(),
      department: (raw.department || '').trim(),
      companyId: (raw.companyId || '').trim(),
      defaultJob: (raw.defaultJob || '').trim(),
      bankAccount: (raw.bankAccount || '').trim(),
      role: (role === 'admin' ? 'admin' : 'employee') as Role,
      accessGroup: (raw.accessGroup || '').trim() || undefined,
    })
  })
  return { rows, errors }
}
