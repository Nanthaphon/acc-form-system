import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }))

const { notifySigned, notifySigners, notifySummary } = await import('./notify')

beforeEach(() => { invoke.mockReset() })

describe('notifySigned — tells the requester a line is signed', () => {
  it('asks notify-signers about the line that was signed', async () => {
    invoke.mockResolvedValue({ data: { sent: 1, noEmail: [], failed: [] }, error: null })
    expect(await notifySigned('s1', 'approver')).toEqual({ sent: 1, noEmail: [], failed: [] })
    expect(invoke).toHaveBeenCalledWith('notify-signers', { body: { submissionId: 's1', signedBlockId: 'approver' } })
  })

  it('is null, never an error, when the mail cannot go (not deployed, fault, thrown)', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('404') })
    expect(await notifySigned('s1', 'approver')).toBeNull()
    invoke.mockImplementation(() => Promise.reject(new Error('network')))
    expect(await notifySigned('s1', 'approver')).toBeNull()
  })
})

describe('notifySigners / notifySummary', () => {
  it('does not call anything with nobody to tell', async () => {
    expect(await notifySigners('s1', [])).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('writes one line about who was mailed and who could not be', () => {
    expect(notifySummary({ sent: 2, noEmail: ['ก'], failed: ['ข'] })).toBe('แจ้งทางอีเมลแล้ว 2 คน · ก ยังไม่มีอีเมลในระบบ · ส่งอีเมลถึง ข ไม่สำเร็จ')
    expect(notifySummary(null)).toBe('')
  })
})
