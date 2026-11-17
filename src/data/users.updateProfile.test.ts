import { describe, it, expect, vi, beforeEach } from 'vitest'

// Each update answers from a queue, and every patch sent is kept.
const sent: Record<string, unknown>[] = []
let answers: { error: { code: string; message: string } | null }[] = []
vi.mock('../lib/supabase', () => ({
  supabaseSecondary: {},
  supabase: {
    from: () => ({
      update: (patch: Record<string, unknown>) => ({
        eq: () => { sent.push(patch); return Promise.resolve(answers.shift() ?? { error: null }) },
      }),
    }),
  },
}))

const { updateProfile, isMissingColumn } = await import('./users')

// What production answered on 2026-11-17: profiles had no email column.
const NO_EMAIL_COLUMN = { error: { code: 'PGRST204', message: "Could not find the 'email' column of 'profiles' in the schema cache" } }

beforeEach(() => { sent.length = 0; answers = [] })

// The screenshot: typing an email on the profile page made "บันทึก" fail with
// "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง".
describe('updateProfile on a database without the email column', () => {
  it('saves everything else, and says the email was left out', async () => {
    answers = [NO_EMAIL_COLUMN]
    const r = await updateProfile('u1', { firstName: 'พรทิพย์', bankAccount: '0093634810', email: 'po@example.com' })
    expect(r).toEqual({ emailSkipped: true })
    expect(sent).toEqual([
      { firstName: 'พรทิพย์', bankAccount: '0093634810', email: 'po@example.com' },
      { firstName: 'พรทิพย์', bankAccount: '0093634810' },
    ])
  })

  it('does not report a skipped email when none was typed', async () => {
    answers = [NO_EMAIL_COLUMN]
    expect(await updateProfile('u1', { firstName: 'ก', email: null })).toEqual({ emailSkipped: false })
  })

  it('still fails on any other refusal', async () => {
    answers = [{ error: { code: 'P0001', message: 'cannot change role, employeeId or accessGroup' } }]
    await expect(updateProfile('u1', { firstName: 'ก', email: 'a@b.co' })).rejects.toMatchObject({ code: 'P0001' })
    expect(sent).toHaveLength(1)
  })

  it('a normal save sends the patch once', async () => {
    expect(await updateProfile('u1', { firstName: 'ก', email: 'a@b.co' })).toEqual({ emailSkipped: false })
    expect(sent).toHaveLength(1)
  })
})

describe('isMissingColumn', () => {
  it('reads both ways Postgres/PostgREST name a missing column', () => {
    expect(isMissingColumn(NO_EMAIL_COLUMN.error, 'email')).toBe(true)
    expect(isMissingColumn({ code: '42703', message: 'column profiles.email does not exist' }, 'email')).toBe(true)
    expect(isMissingColumn({ code: '42703', message: 'column "email" of relation "profiles" does not exist' }, 'email')).toBe(true)
    expect(isMissingColumn({ code: '42703', message: 'column "groupId" of relation "profiles" does not exist' }, 'email')).toBe(false)
    expect(isMissingColumn(null, 'email')).toBe(false)
  })
})
