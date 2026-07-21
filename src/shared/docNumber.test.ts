import { describe, it, expect } from 'vitest'
import { formatDocNumber } from './docNumber'

describe('formatDocNumber', () => {
  it('ประกอบ prefix + ปีเดือน(พ.ศ. 2 หลัก) + running 4 หลัก', () => {
    // 2026-07 → พ.ศ. 2569 → '6907'
    expect(formatDocNumber('GAC6709-003', new Date('2026-07-21'), 1)).toBe('GAC6709-003-6907-0001')
  })
  it('running เกิน 9999 ไม่ตัด', () => {
    expect(formatDocNumber('X', new Date('2026-01-01'), 12345)).toBe('X-6901-12345')
  })
})
