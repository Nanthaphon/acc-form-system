import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cached, clearCache, invalidate } from './cache'

beforeEach(() => { clearCache(); vi.useRealTimers() })

describe('cached', () => {
  it('asks once and answers from memory while fresh', async () => {
    const fetch = vi.fn(() => Promise.resolve([1, 2]))
    expect(await cached('forms', 1000, fetch, true)).toEqual([1, 2])
    expect(await cached('forms', 1000, fetch, true)).toEqual([1, 2])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shares one request between callers at the same moment', async () => {
    const fetch = vi.fn(() => new Promise<number[]>(r => setTimeout(() => r([1]), 5)))
    await Promise.all([cached('k', 1000, fetch, true), cached('k', 1000, fetch, true)])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('asks again once it is stale', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(() => Promise.resolve([1]))
    await cached('k', 1000, fetch, true)
    vi.advanceTimersByTime(1001)
    await cached('k', 1000, fetch, true)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('asks again after a change cleared it, including keyed variants', async () => {
    const fetch = vi.fn(() => Promise.resolve([1]))
    await cached('companies:false', 1000, fetch, true)
    await cached('companies:true', 1000, fetch, true)
    invalidate('companies')
    await cached('companies:false', 1000, fetch, true)
    await cached('companies:true', 1000, fetch, true)
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('keeps neither a failure nor an empty answer', async () => {
    const failing = vi.fn(() => Promise.reject(new Error('x')))
    await expect(cached('k', 1000, failing, true)).rejects.toThrow()
    await expect(cached('k', 1000, failing, true)).rejects.toThrow()
    expect(failing).toHaveBeenCalledTimes(2)
    const empty = vi.fn(() => Promise.resolve([]))
    await cached('e', 1000, empty, true)
    await cached('e', 1000, empty, true)
    expect(empty).toHaveBeenCalledTimes(2)
  })

  it('is a plain call when switched off', async () => {
    const fetch = vi.fn(() => Promise.resolve([1]))
    await cached('k', 1000, fetch, false)
    await cached('k', 1000, fetch, false)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
