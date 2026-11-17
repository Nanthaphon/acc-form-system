import { useState } from 'react'

export const PAGE_SIZES = [10, 25, 50, 100] as const

// How many lines a page this person last picked on this table. Kept in their
// browser only; a missing or blocked store falls back to the default.
function readSize(key: string | undefined, fallback: number): number {
  if (!key) return fallback
  try {
    const n = Number(localStorage.getItem(key))
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : fallback
  } catch { return fallback }
}

// One page of a list. The page is kept within range as the list changes, so
// deleting the last line of the last page steps back one page rather than
// leaving an empty table. Changing a filter should call setPage(1).
export function usePagination<T>(items: T[], { pageSize: initial = 10, storageKey }: { pageSize?: number; storageKey?: string } = {}) {
  const [wanted, setPage] = useState(1)
  const [pageSize, setSize] = useState(() => readSize(storageKey, initial))
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(Math.max(1, wanted), pageCount)
  const start = (page - 1) * pageSize

  function setPageSize(n: number) {
    setSize(n)
    setPage(1)
    if (storageKey) try { localStorage.setItem(storageKey, String(n)) } catch { /* only a convenience */ }
  }

  return {
    page,
    pageCount,
    pageSize,
    pageItems: items.slice(start, start + pageSize),
    setPage,
    setPageSize,
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
  }
}
