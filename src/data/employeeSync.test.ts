import { describe, expect, it, vi, beforeEach } from 'vitest'

const invoke = vi.fn()
vi.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }))

const { syncEmployees, syncErrorMessage } = await import('./employeeSync')

// What supabase-js hands back when the function answered with an error status.
const httpError = (status: number, body: unknown) => ({
  name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code',
  context: new Response(JSON.stringify(body), { status }),
})

describe('syncEmployees', () => {
  beforeEach(() => invoke.mockReset())

  it('asks the function for a preview or a real sync', async () => {
    invoke.mockResolvedValue({ data: { dryRun: true }, error: null })
    await syncEmployees(true)
    expect(invoke).toHaveBeenCalledWith('sync-employees', { body: { dryRun: true } })
  })

  it('turns the function’s own error code into what to do about it', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(409, { error: 'MIGRATION_MISSING' }) })
    await expect(syncEmployees()).rejects.toThrow('2026-11-20-central-employees.sql')
    invoke.mockResolvedValue({ data: null, error: httpError(409, { error: 'NOT_CONFIGURED' }) })
    await expect(syncEmployees()).rejects.toThrow('CENTRAL_FEED_TOKEN')
  })

  it('says the function is not installed when it cannot be reached', async () => {
    invoke.mockResolvedValue({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request' } })
    await expect(syncEmployees()).rejects.toThrow('ยังไม่ได้ติดตั้ง Edge Function sync-employees')
  })
})

describe('syncErrorMessage', () => {
  it('explains a wrong token and a central project without the feed', () => {
    expect(syncErrorMessage('CENTRAL 400: {"message":"invalid token"}')).toContain('token ของระบบกลางไม่ถูกต้อง')
    expect(syncErrorMessage('CENTRAL 404: {"code":"PGRST202"}')).toContain('acc-employee-feed.sql')
  })
})

