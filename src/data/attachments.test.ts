import { describe, expect, it } from 'vitest'
import { checkAttachmentLimits, formatBytes, MAX_ATTACHMENTS } from './attachments'

const MB = 1024 * 1024
const files = (n: number, size: number) => Array.from({ length: n }, (_, i) => ({ name: `f${i}.pdf`, size }))

describe('checkAttachmentLimits', () => {
  it('accepts the maximum: 5 files of exactly 5 MB (25 MB total)', () => {
    expect(checkAttachmentLimits([], files(5, 5 * MB))).toBeNull()
  })

  it('rejects going past 5 files, counting files already attached', () => {
    expect(checkAttachmentLimits([MB, MB, MB], files(3, MB))).toContain(`สูงสุด ${MAX_ATTACHMENTS} ไฟล์`)
    expect(checkAttachmentLimits([MB, MB, MB], files(2, MB))).toBeNull()
  })

  it('rejects a single file over 5 MB and names it', () => {
    const msg = checkAttachmentLimits([], [{ name: 'ใบเสร็จ.pdf', size: 5 * MB + 1 }])
    expect(msg).toContain('ใบเสร็จ.pdf')
    expect(msg).toContain('ต่อไฟล์')
  })
})

describe('formatBytes', () => {
  it('picks a readable unit', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * MB)).toBe('5 MB')
    expect(formatBytes(1.5 * MB)).toBe('1.5 MB')
  })
})
