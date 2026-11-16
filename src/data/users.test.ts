import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CsvEmployeeRow } from '../shared/csv'

// Supabase stands in for itself: signUp answers from a queue, so a test can
// say "refuse this one for the rate limit, then let it through". `profiles` is
// who is already in the employee list; insert and rpc answer as each test says.
const signUp = vi.fn()
const rpc = vi.fn()
const insert = vi.fn()
let profiles: { employeeId: string; firstName: string; lastName: string }[] = []
vi.mock('../lib/supabase', () => ({
  supabaseSecondary: { auth: { signUp: (...a: unknown[]) => signUp(...a), signOut: () => Promise.resolve({}) } },
  supabase: {
    from: () => ({
      insert: (...a: unknown[]) => insert(...a),
      select: () => ({ ilike: () => Promise.resolve({ data: profiles, error: null }) }),
    }),
    rpc: (...a: unknown[]) => rpc(...a),
  },
}))

const { importEmployees, isRateLimited, createEmployee } = await import('./users')

const RATE_LIMITED = { data: { user: null }, error: { status: 429, code: 'over_request_rate_limit', message: 'Request rate limit reached' } }
const TAKEN = { data: { user: null }, error: { status: 422, code: 'user_already_exists', message: 'User already registered' } }
const CREATED = (id: string) => ({ data: { user: { id } }, error: null })

const row = (employeeId: string): CsvEmployeeRow => ({
  employeeId, firstName: 'ก', lastName: 'ข', position: '', department: '',
  companyId: 'globe', defaultJob: '', bankAccount: '', role: 'employee',
})

beforeEach(() => {
  signUp.mockReset(); rpc.mockReset(); insert.mockReset()
  insert.mockResolvedValue({ error: null })
  profiles = []
})

// The screenshot: "เพิ่มพนักงานไม่สำเร็จ: User already registered".
describe('createEmployee', () => {
  it('says in Thai who already has the ID, without trying to sign up', async () => {
    profiles = [{ employeeId: '1010001', firstName: 'สมชาย', lastName: 'ใจดี' }]
    await expect(createEmployee(row('1010001'))).rejects.toThrow('รหัสพนักงาน 1010001 เป็นของ สมชาย ใจดี อยู่แล้ว')
    expect(signUp).not.toHaveBeenCalled()
  })

  it('treats another case of the same ID as the same person (one login email)', async () => {
    profiles = [{ employeeId: 'ACC001', firstName: 'ก', lastName: 'ข' }]
    await expect(createEmployee(row('acc001'))).rejects.toThrow('ซ้ำกับ ACC001 ของ ก ข')
  })

  it('frees a login left behind by an earlier failed add, then adds the person', async () => {
    signUp.mockResolvedValueOnce(TAKEN).mockResolvedValueOnce(CREATED('u1'))
    rpc.mockResolvedValue({ data: 'released', error: null })
    expect(await createEmployee(row('1010001'))).toBe('u1')
    expect(rpc).toHaveBeenCalledWith('release_orphan_login', { employee_id: '1010001' })
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('leaves a login that belongs to someone alone, and says so in Thai', async () => {
    signUp.mockResolvedValueOnce(TAKEN)
    rpc.mockResolvedValue({ data: 'taken', error: null })
    await expect(createEmployee(row('1010001'))).rejects.toThrow('มีบัญชีเข้าสู่ระบบอยู่แล้ว')
    expect(signUp).toHaveBeenCalledTimes(1)
  })

  it('names the SQL file to run when the database does not have the fix yet', async () => {
    signUp.mockResolvedValueOnce(TAKEN)
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
    await expect(createEmployee(row('1010001'))).rejects.toThrow('2026-11-16-orphan-login.sql')
  })

  it('undoes its login when the profile cannot be saved, so the ID stays usable', async () => {
    signUp.mockResolvedValueOnce(CREATED('u1'))
    insert.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } })
    rpc.mockResolvedValue({ data: 'released', error: null })
    await expect(createEmployee(row('1010001'))).rejects.toThrow('row-level security')
    expect(rpc).toHaveBeenCalledWith('release_orphan_login', { employee_id: '1010001' })
  })
})

describe('importEmployees', () => {
  beforeEach(() => { vi.useFakeTimers() })
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
    signUp.mockResolvedValueOnce({ data: { user: null }, error: { status: 422, message: 'Signups not allowed for this instance' } })
    const done = importEmployees([row('1010001')])
    await vi.runAllTimersAsync()
    expect(await done).toEqual({ ok: 0, failed: [{ employeeId: '1010001', reason: 'Signups not allowed for this instance' }] })
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
