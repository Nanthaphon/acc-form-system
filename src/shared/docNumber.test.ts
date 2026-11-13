import { describe, it, expect } from 'vitest'
import { baseDocNumber, formatDocNumber, reviseDocNumber, revisionOf } from './docNumber'

describe('formatDocNumber', () => {
  it('ประกอบ prefix + ปีเดือน(ค.ศ.) + running 4 หลัก', () => {
    expect(formatDocNumber('GAC6709-003', new Date('2026-07-21'), 1)).toBe('GAC6709-003-202607-0001')
  })
  it('running เกิน 9999 ไม่ตัด', () => {
    expect(formatDocNumber('X', new Date('2026-01-01'), 12345)).toBe('X-202601-12345')
  })
  it('ไม่มีรหัสฟอร์ม → เหลือแค่ ปีเดือน-เลขรัน', () => {
    expect(formatDocNumber('', new Date('2026-08-01'), 7)).toBe('202608-0007')
  })
})

describe('เลขฉบับแก้ไข', () => {
  it('ฉบับแก้ไขครั้งแรกต่อท้ายด้วย -R1', () => {
    expect(reviseDocNumber('GAC69-005-202611-0048')).toBe('GAC69-005-202611-0048-R1')
  })
  it('แก้ซ้ำนับต่อไปเรื่อยๆ', () => {
    expect(reviseDocNumber('GAC69-005-202611-0048-R1')).toBe('GAC69-005-202611-0048-R2')
    expect(reviseDocNumber('GAC69-005-202611-0048-R9')).toBe('GAC69-005-202611-0048-R10')
  })
  it('บอกได้ว่าเป็นการแก้ครั้งที่เท่าไร', () => {
    expect(revisionOf('GAC69-005-202611-0048')).toBe(0)
    expect(revisionOf('GAC69-005-202611-0048-R2')).toBe(2)
  })
  it('ทุกฉบับมีเลขต้นทางเดียวกัน', () => {
    expect(baseDocNumber('GAC69-005-202611-0048-R3')).toBe('GAC69-005-202611-0048')
    expect(baseDocNumber('GAC69-005-202611-0048')).toBe('GAC69-005-202611-0048')
  })
})
