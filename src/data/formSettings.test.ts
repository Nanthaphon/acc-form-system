import { describe, expect, it, vi } from 'vitest'
import { writeSkippingMissing } from './formSettings'

const missing = (col: string) => ({ error: { code: 'PGRST204', message: `Could not find the '${col}' column of 'form_settings' in the schema cache` } })
const ok = { error: null }

describe('writeSkippingMissing', () => {
  it('writes once when every column exists', async () => {
    const write = vi.fn().mockResolvedValue(ok)
    expect(await writeSkippingMissing(write, { a: 1, b: 2 })).toEqual([])
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('drops each column the database lacks and retries', async () => {
    const write = vi.fn()
      .mockResolvedValueOnce(missing('accessGroups'))
      .mockResolvedValueOnce(missing('updatedAt'))
      .mockResolvedValueOnce(ok)
    const skipped = await writeSkippingMissing(write, { name: 'x', accessGroups: ['g1'], updatedAt: 1 })
    expect(skipped).toEqual(['accessGroups', 'updatedAt'])
    expect(write).toHaveBeenLastCalledWith({ name: 'x' })
  })

  it('rethrows any other error', async () => {
    const err = { code: '42501', message: 'permission denied' }
    await expect(writeSkippingMissing(vi.fn().mockResolvedValue({ error: err }), { a: 1 })).rejects.toBe(err)
  })

  it('rethrows when the reported column is not in the row (no endless retry)', async () => {
    const write = vi.fn().mockResolvedValue(missing('zzz'))
    await expect(writeSkippingMissing(write, { a: 1 })).rejects.toMatchObject({ code: 'PGRST204' })
    expect(write).toHaveBeenCalledTimes(1)
  })
})
