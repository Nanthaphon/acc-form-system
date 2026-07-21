import { describe, it, expect } from 'vitest'
import { parseEmployeeCsv } from './csv'

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
})
