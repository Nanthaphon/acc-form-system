import { describe, expect, it } from 'vitest'
import Papa from 'papaparse'
import { employeesCsvName, employeesToCsv } from './employeeCsv'
import type { UserProfile } from '../types/schema'

const person = (o: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'u1', employeeId: '1010001', firstName: 'อ้อมฤทัย', lastName: 'โรจนภาสกร', nickname: 'Jib',
  position: 'Compensation, Benefit', department: 'Payroll', companyId: 'globe', email: 'jib@globe.co.th',
  defaultJob: 'ACC', bankAccount: '0582832579', role: 'employee', accessGroup: 'g1',
  mustChangePassword: false, createdAt: 0, ...o,
})
const companies = [{ id: 'globe', name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', address: '', shortName: 'Globe Syndicate' }]
const groups = [{ id: 'g1', name: 'บัญชี' }] as never[]

describe('employeesToCsv', () => {
  it('starts with a BOM so Excel reads Thai, then a header and one line a person', () => {
    const csv = employeesToCsv([person(), person({ uid: 'u2', employeeId: '1010002', nickname: undefined, centralStatus: 'resigned' })], companies, groups)
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
    const { data } = Papa.parse<string[]>(csv.slice(1))
    expect(data[0].slice(0, 4)).toEqual(['รหัสพนักงาน', 'ชื่อ', 'นามสกุล', 'ชื่อเล่น'])
    expect(data[1]).toEqual(['1010001', 'อ้อมฤทัย', 'โรจนภาสกร', 'Jib', 'Compensation, Benefit', 'Payroll',
      'Globe Syndicate', 'jib@globe.co.th', 'บัญชี', 'พนักงาน', 'ACC', '0582832579', ''])
    expect(data[2][3]).toBe('')
    expect(data[2][12]).toBe('ลาออกแล้ว')
  })

  it('keeps a value with a comma in one cell', () => {
    expect(employeesToCsv([person()], companies, groups)).toContain('"Compensation, Benefit"')
  })

  it('names the file by the Bangkok date', () => {
    expect(employeesCsvName(new Date('2026-11-20T18:00:00Z'))).toBe('พนักงาน-2026-11-21.csv')
  })
})
