import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { pageList, usePagination } from './usePagination'

describe('pageList', () => {
  it('shows every page when there are few', () => {
    expect(pageList(1, 1)).toEqual([1])
    expect(pageList(2, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it('leaves out the far pages with … around the current one', () => {
    expect(pageList(6, 11)).toEqual([1, null, 5, 6, 7, null, 11])
  })
  it('keeps five in a row near either end', () => {
    expect(pageList(1, 11)).toEqual([1, 2, 3, 4, 5, null, 11])
    expect(pageList(4, 11)).toEqual([1, 2, 3, 4, 5, null, 11])
    expect(pageList(11, 11)).toEqual([1, null, 7, 8, 9, 10, 11])
  })
  it('is never wider than seven', () => {
    for (let n = 1; n <= 30; n++) for (let p = 1; p <= n; p++) expect(pageList(p, n).length).toBeLessThanOrEqual(7)
  })
})

describe('usePagination', () => {
  const list = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

  it('slices one page and says which lines it shows', () => {
    const { result } = renderHook(() => usePagination(list(110), 10))
    expect(result.current).toMatchObject({ page: 1, pageCount: 11, from: 1, to: 10, total: 110 })
    act(() => result.current.setPage(11))
    expect(result.current.pageItems).toEqual(list(110).slice(100))
    expect(result.current).toMatchObject({ from: 101, to: 110 })
  })

  it('steps back a page when the last page empties', () => {
    const { result, rerender } = renderHook(({ n }) => usePagination(list(n), 10), { initialProps: { n: 21 } })
    act(() => result.current.setPage(3))
    expect(result.current.pageItems).toEqual([21])
    rerender({ n: 20 })
    expect(result.current.page).toBe(2)
    expect(result.current.pageItems).toEqual(list(20).slice(10))
  })

  it('an empty list is page 1 of 1', () => {
    const { result } = renderHook(() => usePagination([], 10))
    expect(result.current).toMatchObject({ page: 1, pageCount: 1, from: 0, to: 0, total: 0 })
  })
})
