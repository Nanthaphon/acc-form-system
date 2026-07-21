import Papa from 'papaparse'
import type { Role } from '../types/schema'

export interface CsvEmployeeRow {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role
}

const REQUIRED = ['employeeId', 'firstName', 'lastName', 'companyId'] as const

export function parseEmployeeCsv(text: string): { rows: CsvEmployeeRow[]; errors: string[] } {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true })
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
    })
  })
  return { rows, errors }
}
