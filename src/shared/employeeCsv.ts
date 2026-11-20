import Papa from 'papaparse'
import type { AccessGroup, Company, UserProfile } from '../types/schema'
import { roleLabel } from './roles'

const HEADERS = ['รหัสพนักงาน', 'ชื่อ', 'นามสกุล', 'ชื่อเล่น', 'ตำแหน่ง', 'แผนก', 'บริษัท', 'อีเมล', 'กลุ่มการเข้าถึง', 'สิทธิ์', 'Job', 'เลขบัญชี', 'สถานะ']

/** The employee list as CSV text, one person a line, names rather than ids.
 *  Starts with a byte-order mark so Excel reads the Thai as UTF-8. */
export function employeesToCsv(people: UserProfile[], companies: Company[], groups: AccessGroup[]): string {
  const company = (id: string) => { const c = companies.find(x => x.id === id); return c?.shortName || c?.name || id }
  const group = (id?: string) => (id && groups.find(g => g.id === id)?.name) || ''
  const rows = people.map(p => [
    p.employeeId, p.firstName, p.lastName, p.nickname ?? '', p.position, p.department,
    company(p.companyId), p.email ?? '', group(p.accessGroup), roleLabel(p), p.defaultJob, p.bankAccount,
    p.centralStatus === 'resigned' ? 'ลาออกแล้ว' : '',
  ].map(v => String(v ?? '').trim()))
  return '﻿' + Papa.unparse({ fields: HEADERS, data: rows }, { newline: '\r\n' })
}

/** พนักงาน-2026-11-20.csv */
export function employeesCsvName(now = new Date()): string {
  const d = new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10) // Bangkok date
  return `พนักงาน-${d}.csv`
}
