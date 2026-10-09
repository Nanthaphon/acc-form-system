import { useEffect, useState } from 'react'

// How large the text in the fill-in table is. Columns are narrow and a claim
// can hold a lot of detail, so the size is the reader's to choose: smaller to
// see more of the table at once, larger to read it comfortably. It is a display
// preference of this browser only — it changes nothing about the document or
// how it prints.
export type TableTextSize = 'small' | 'normal' | 'large'

export const TEXT_SIZES: { value: TableTextSize; label: string; cell: string; head: string }[] = [
  { value: 'small', label: 'เล็ก', cell: 'text-[11px]', head: 'text-[10px]' },
  { value: 'normal', label: 'ปกติ', cell: 'text-xs', head: 'text-[11px]' },
  { value: 'large', label: 'ใหญ่', cell: 'text-sm', head: 'text-xs' },
]

const KEY = 'fillTable:textSize'
const known = (v: unknown): v is TableTextSize => TEXT_SIZES.some(s => s.value === v)

export function useTableTextSize() {
  const [size, setSize] = useState<TableTextSize>(() => {
    try {
      const saved = localStorage.getItem(KEY)
      return known(saved) ? saved : 'normal'
    } catch { return 'normal' }   // storage can be blocked
  })
  useEffect(() => {
    try { localStorage.setItem(KEY, size) } catch { /* nothing to do about it */ }
  }, [size])
  const chosen = TEXT_SIZES.find(s => s.value === size) ?? TEXT_SIZES[1]
  return { size, setSize, cellText: chosen.cell, headText: chosen.head }
}
