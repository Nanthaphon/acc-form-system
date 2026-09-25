import { describe, it, expect } from 'vitest'
import { checkAgainstLists, parseEmployeeCsv } from './csv'
import type { CsvEmployeeRow, ImportLists } from './csv'

const CSV = `employeeId,firstName,lastName,position,department,companyId,defaultJob,bankAccount,role
244530,หทัยรัตน์,ไวยขุนทด,PC Specialist,PC,globe,Haier,SCB-123,employee
244531,สมชาย,ใจดี,Manager,HR,besthrm,,KTB-456,admin`

describe('parseEmployeeCsv', () => {
  it('แปลงแถวเป็นโปรไฟล์', () => {
    const { rows, errors } = parseEmployeeCsv(CSV)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(2)
    expect(rows[0].employeeId).toBe('244530')
    expect(rows[0].role).toBe('employee')
    expect(rows[1].role).toBe('admin')
  })
  it('รายงาน error เมื่อขาด employeeId', () => {
    const bad = `employeeId,firstName,lastName,position,department,companyId,defaultJob,bankAccount,role
,x,y,z,d,globe,,,employee`
    const { errors } = parseEmployeeCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('employeeId')
  })
  it('role ผิดค่า → error', () => {
    const bad = `employeeId,firstName,lastName,position,department,companyId,defaultJob,bankAccount,role
1,x,y,z,d,globe,,,superuser`
    const { errors } = parseEmployeeCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
  })
  it('ไม่สนใจ BOM ที่ Excel ใส่หน้าไฟล์ CSV UTF-8', () => {
    const { rows, errors } = parseEmployeeCsv(String.fromCharCode(0xfeff) + CSV)
    expect(errors).toHaveLength(0)
    expect(rows[0].employeeId).toBe('244530')
  })
})

describe('checkAgainstLists', () => {
  const lists: ImportLists = {
    companies: [{ id: 'globe', name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', shortName: 'Globe Syndicate' }],
    groups: [{ id: '80da51c6-06bb-4d7c-8eba-c8b227bccc39', name: 'HR' }],
    departments: ['Payroll', 'บัญชี'],
    positions: [],
  }
  const row = (over: Partial<CsvEmployeeRow> = {}): CsvEmployeeRow => ({
    employeeId: '1020001', firstName: 'สมหญิง', lastName: 'รักงาน', position: '', department: '',
    companyId: 'globe', defaultJob: '', bankAccount: '', role: 'employee', line: 2, ...over,
  })
  const check = (r: CsvEmployeeRow, l: ImportLists = lists) => checkAgainstLists({ rows: [r], errors: [] }, l)

  it('takes a group by the name the template offers, and stores its code', () => {
    const { rows, errors } = check(row({ accessGroup: 'hr' }))
    expect(errors).toEqual([])
    expect(rows[0].accessGroup).toBe('80da51c6-06bb-4d7c-8eba-c8b227bccc39')
  })

  it('still takes a group by its code', () => {
    const { rows } = check(row({ accessGroup: '80da51c6-06bb-4d7c-8eba-c8b227bccc39' }))
    expect(rows[0].accessGroup).toBe('80da51c6-06bb-4d7c-8eba-c8b227bccc39')
  })

  // The template offers the short name, and people's own lists already use it.
  it('takes a company by its short name, and stores its code', () => {
    const { rows, errors } = check(row({ companyId: 'globe syndicate' }))
    expect(errors).toEqual([])
    expect(rows[0].companyId).toBe('globe')
  })

  it('takes a company by its full name as well as its code', () => {
    const { rows, errors } = check(row({ companyId: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด' }))
    expect(errors).toEqual([])
    expect(rows[0].companyId).toBe('globe')
  })

  it('stores a department in the list\'s own spelling', () => {
    const { rows, errors } = check(row({ department: '  payroll ' }))
    expect(errors).toEqual([])
    expect(rows[0].department).toBe('Payroll')
  })

  // แผนก and ตำแหน่ง are free text: the Custom Field list suggests, it never refuses.
  it('takes a department that is not on the list, exactly as typed', () => {
    const { rows, errors } = check(row({ department: 'Operation Team 6 (Haier)' }))
    expect(errors).toEqual([])
    expect(rows[0].department).toBe('Operation Team 6 (Haier)')
  })

  it('leaves a field with no list as the free text it has always been', () => {
    const { rows, errors } = check(row({ position: 'ตำแหน่งอะไรก็ได้' }))
    expect(errors).toEqual([])
    expect(rows[0].position).toBe('ตำแหน่งอะไรก็ได้')
  })

  it('refuses a group or company the system does not have', () => {
    const { errors } = check(row({ companyId: 'acme', accessGroup: 'Sales' }))
    expect(errors).toEqual([
      'บรรทัด 2: ไม่พบบริษัท "acme" ในระบบ',
      'บรรทัด 2: ไม่พบกลุ่ม "Sales" ในระบบ',
    ])
  })

  // A list that failed to load arrives empty. Reading that as "nothing is
  // allowed" would refuse every row in the file over a network hiccup.
  it('treats an empty list as unknown, never as nothing allowed', () => {
    const none: ImportLists = { companies: [], groups: [], departments: [], positions: [] }
    const { errors } = check(row({ companyId: 'acme', accessGroup: 'x', department: 'y' }), none)
    expect(errors).toEqual([])
  })
})
