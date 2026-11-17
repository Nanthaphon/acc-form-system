import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePagination } from './usePagination'

const list = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

beforeEach(() => localStorage.clear())

describe('usePagination', () => {
  it('slices one page and says which lines it shows', () => {
    const { result } = renderHook(() => usePagination(list(110)))
    expect(result.current).toMatchObject({ page: 1, pageCount: 11, pageSize: 10, from: 1, to: 10, total: 110 })
    act(() => result.current.setPage(11))
    expect(result.current.pageItems).toEqual(list(110).slice(100))
    expect(result.current).toMatchObject({ from: 101, to: 110 })
  })

  it('steps back a page when the last page empties', () => {
    const { result, rerender } = renderHook(({ n }) => usePagination(list(n)), { initialProps: { n: 21 } })
    act(() => result.current.setPage(3))
    expect(result.current.pageItems).toEqual([21])
    rerender({ n: 20 })
    expect(result.current.page).toBe(2)
    expect(result.current.pageItems).toEqual(list(20).slice(10))
  })

  it('an empty list is page 1 of 1', () => {
    const { result } = renderHook(() => usePagination([]))
    expect(result.current).toMatchObject({ page: 1, pageCount: 1, from: 0, to: 0, total: 0 })
  })

  it('a new page size starts again from page 1 and is remembered', () => {
    const { result } = renderHook(() => usePagination(list(110), { storageKey: 'k' }))
    act(() => result.current.setPage(4))
    act(() => result.current.setPageSize(50))
    expect(result.current).toMatchObject({ page: 1, pageCount: 3, from: 1, to: 50 })
    const again = renderHook(() => usePagination(list(110), { storageKey: 'k' }))
    expect(again.result.current.pageSize).toBe(50)
  })

  it('ignores a stored size that is not one of the choices', () => {
    localStorage.setItem('k', '7')
    const { result } = renderHook(() => usePagination(list(110), { storageKey: 'k' }))
    expect(result.current.pageSize).toBe(10)
  })
})
