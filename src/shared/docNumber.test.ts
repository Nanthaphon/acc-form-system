import { describe, it, expect } from 'vitest'
import { formatDocNumber } from './docNumber'

describe('formatDocNumber', () => {
  it('ประกอบ prefix + ปีเดือน(ค.ศ.) + running 4 หลัก', () => {
    expect(formatDocNumber('GAC6709-003', new Date('2026-07-21'), 1)).toBe('GAC6709-003-202607-0001')
  })
  it('running เกิน 9999 ไม่ตัด', () => {
    expect(formatDocNumber('X', new Date('2026-01-01'), 12345)).toBe('X-202601-12345')
  })
})
