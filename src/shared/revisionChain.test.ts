import { describe, it, expect } from 'vitest'
import { chainRows, chainLength } from './revisionChain'
import type { SubmissionSummary } from '../types/schema'

const doc = (id: string, docNumber: string, replaces?: { id: string; docNumber: string }): SubmissionSummary => ({
  id, docNumber, formType: 'f-claim', header: {} as never, totals: {} as never,
  createdBy: 'u1', createdByEmployeeId: '1010154', createdAt: 0, updatedAt: 0,
  printCount: 0, lastPrintedAt: null, replaces: replaces ?? null,
} as unknown as SubmissionSummary)

// 0048 was signed, found wrong and corrected twice.
const first = doc('a', 'GAC69-005-202611-0048')
const r1 = doc('b', 'GAC69-005-202611-0048-R1', { id: 'a', docNumber: 'GAC69-005-202611-0048' })
const r2 = doc('c', 'GAC69-005-202611-0048-R2', { id: 'b', docNumber: 'GAC69-005-202611-0048-R1' })
const other = doc('z', 'GAC69-005-202611-0049')

describe('การรวมเอกสารฉบับแก้ไขเป็นสายเดียว', () => {
  it('เหลือเฉพาะฉบับล่าสุดในรายการ ฉบับก่อนหน้าพับไว้ข้างใน', () => {
    const chains = chainRows([r2, r1, first, other])
    expect(chains.map(c => c.latest.id)).toEqual(['c', 'z'])
    expect(chains[0].older.map(c => c.docNumber)).toEqual([
      'GAC69-005-202611-0048-R1', 'GAC69-005-202611-0048',
    ])
  })

  it('นับจำนวนฉบับทั้งสาย', () => {
    const [chain] = chainRows([r2, r1, first])
    expect(chainLength(chain)).toBe(3)
    expect(chainLength(chainRows([other])[0])).toBe(1)
  })

  it('เอกสารที่ไม่เคยแก้ ไม่มีอะไรให้กาง', () => {
    expect(chainRows([other])[0].older).toEqual([])
  })

  it('ถึงตัวกรองจะซ่อนฉบับเก่า สายก็ยังครบ', () => {
    const chains = chainRows([r2], [r2, r1, first])
    expect(chains[0].older.map(c => c.id)).toEqual(['b', 'a'])
  })

  it('ฉบับเก่าที่ไม่ได้โหลดมาด้วย ก็ไม่ทำให้สายพัง', () => {
    const chains = chainRows([r1], [r1])
    expect(chains[0].latest.id).toBe('b')
    expect(chains[0].older).toEqual([])
  })

  it('ตัวกรองซ่อนฉบับล่าสุดไว้ ฉบับเก่าก็ยังอยู่ในรายการ ไม่หายไปเฉยๆ', () => {
    const chains = chainRows([r1, first], [r2, r1, first])
    expect(chains.map(c => c.latest.id)).toEqual(['b'])
    expect(chains[0].older.map(c => c.id)).toEqual(['a'])
  })

  it('ลิงก์วนกลับมาที่เดิมก็ไม่ค้าง และไม่ทำให้เอกสารหายไปจากหน้า', () => {
    const x = doc('x', 'X-1', { id: 'y', docNumber: 'Y-1' })
    const y = doc('y', 'Y-1', { id: 'x', docNumber: 'X-1' })
    const chains = chainRows([x, y])
    expect(chains.map(c => c.latest.id).sort()).toEqual(['x', 'y'])
  })
})
