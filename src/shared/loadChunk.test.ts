import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isChunkLoadError, loadChunk } from './loadChunk'
import { uiAlert } from '../components/dialog/dialogService'

vi.mock('../components/dialog/dialogService', () => ({ uiAlert: vi.fn(() => Promise.resolve(true)) }))

const stale = () => Promise.reject(new TypeError('Failed to fetch dynamically imported module: https://acc-form-system.vercel.app/assets/excelExport-DMj07Dak.js'))
const settle = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => { sessionStorage.clear(); vi.mocked(uiAlert).mockClear() })

describe('loadChunk', () => {
  it('knows a stale-file error in every browser', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: x.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: x.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('ไม่มีสิทธิ์'))).toBe(false)
  })

  it('passes the module through when it loads', async () => {
    await expect(loadChunk(() => Promise.resolve({ a: 1 }))).resolves.toEqual({ a: 1 })
  })

  it('a new version went live: says so and reloads the page', async () => {
    const reload = vi.fn()
    void loadChunk(stale, reload)
    await settle()
    expect(uiAlert).toHaveBeenCalledWith(expect.stringContaining('เวอร์ชันใหม่'), expect.anything())
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads only once — failing again right after passes the error on', async () => {
    const reload = vi.fn()
    void loadChunk(stale, reload)
    await settle()
    await expect(loadChunk(stale, reload)).rejects.toThrow(/dynamically imported module/)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('other errors are not a reason to reload', async () => {
    const reload = vi.fn()
    await expect(loadChunk(() => Promise.reject(new Error('boom')), reload)).rejects.toThrow('boom')
    expect(reload).not.toHaveBeenCalled()
  })
})
