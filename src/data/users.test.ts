import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CsvEmployeeRow } from '../shared/csv'

// Supabase stands in for itself: signUp answers from a queue, so a test can
// say "refuse this one for the rate limit, then let it through".
const signUp = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabaseSecondary: { auth: { signUp: (...a: unknown[]) => signUp(...a), signOut: () => Promise.resolve({}) } },
  supabase: { from: () => ({ insert: () => Promise.resolve({ error: null }) }) },
}))

const { importEmployees, isRateLimited } = await import('./users')

const RATE_LIMITED = { data: { user: null }, error: { status: 429, code: 'over_request_rate_limit', message: 'Request rate limit reached' } }
const CREATED = (id: string) => ({ data: { user: { id } }, error: null })

const row = (employeeId: string): CsvEmployeeRow => ({
  employeeId, firstName: 'ก', lastName: 'ข', position: '', department: '',
  companyId: 'globe', defaultJob: '', bankAccount: '', role: 'employee',
})

describe('importEmployees', () => {
  beforeEach(() => { vi.useFakeTimers(); signUp.mockReset() })
  afterEach(() => { vi.useRealTimers() })

  // The screenshot: 29 made it, and everyone after the limit failed outright.
  it('waits out the sign-up rate limit and carries on, instead of failing', async () => {
    signUp
      .mockResolvedValueOnce(CREATED('a'))
      .mockResolvedValueOnce(RATE_LIMITED)
      .mockResolvedValueOnce(RATE_LIMITED)
      .mockResolvedValueOnce(CREATED('b'))
    const progress: (number | undefined)[] = []

    const done = importEmployees([row('1010001'), row('1010002')], p => progress.push(p.waiting))
    await vi.runAllTimersAsync()

    expect(await done).toEqual({ ok: 2, failed: [] })
    expect(signUp).toHaveBeenCalledTimes(4)
    expect(progress).toContain(12) // the countdown was shown
  })

  it('still reports any other failure at once, without waiting', async () => {
    signUp.mockResolvedValueOnce({ data: { user: null }, error: { status: 422, message: 'User already registered' } })
    const done = importEmployees([row('1010001')])
    await vi.runAllTimersAsync()
    expect(await done).toEqual({ ok: 0, failed: [{ employeeId: '1010001', reason: 'User already registered' }] })
    expect(signUp).toHaveBeenCalledTimes(1)
  })

  it('gives up on a limit that never lifts, rather than waiting forever', async () => {
    signUp.mockResolvedValue(RATE_LIMITED)
    const done = importEmployees([row('1010001')])
    await vi.runAllTimersAsync()
    const res = await done
    expect(res.failed).toEqual([{ employeeId: '1010001', reason: 'Request rate limit reached' }])
    expect(signUp.mock.calls.length).toBeLessThan(40)
  })
})

describe('isRateLimited', () => {
  it('recognises the limit by status, code or message', () => {
    expect(isRateLimited({ status: 429 })).toBe(true)
    expect(isRateLimited({ code: 'over_request_rate_limit' })).toBe(true)
    expect(isRateLimited({ message: 'Request rate limit reached' })).toBe(true)
    expect(isRateLimited({ message: 'Password should be at least 6 characters.' })).toBe(false)
  })
})
