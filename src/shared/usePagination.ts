import { useState } from 'react'

// The page numbers a pager shows: the first, the last, and the ones either side
// of the current page, with null where a run of numbers is left out (…).
//   pageList(1, 3)  → [1, 2, 3]
//   pageList(6, 11) → [1, null, 5, 6, 7, null, 11]
export function pageList(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const keep = new Set([1, pageCount, page - 1, page, page + 1])
  // Near either end, show five in a row so the bar keeps the same width.
  if (page <= 4) [2, 3, 4, 5].forEach(n => keep.add(n))
  if (page >= pageCount - 3) [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].forEach(n => keep.add(n))
  const nums = [...keep].filter(n => n >= 1 && n <= pageCount).sort((a, b) => a - b)
  const out: (number | null)[] = []
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push(null)
    out.push(n)
  })
  return out
}

// One page of a list. The page is kept within range as the list changes, so
// deleting the last line of the last page steps back one page rather than
// leaving an empty table. Changing a filter should call setPage(1).
export function usePagination<T>(items: T[], pageSize: number) {
  const [wanted, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(Math.max(1, wanted), pageCount)
  const start = (page - 1) * pageSize
  return {
    page,
    pageCount,
    pageItems: items.slice(start, start + pageSize),
    setPage,
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
  }
}
