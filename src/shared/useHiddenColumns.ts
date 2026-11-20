import { useEffect, useState } from 'react'

// Which table columns the viewer has hidden, remembered per table in this
// browser. Storage can be unavailable (private mode, blocked site data) — then
// every column simply starts visible.
// defaultHidden: columns that start hidden until the viewer turns them on.
export function useHiddenColumns(storageKey: string, defaultHidden: readonly string[] = []) {
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw === null) return new Set(defaultHidden)
      const v: unknown = JSON.parse(raw)
      return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    } catch {
      return new Set(defaultHidden)
    }
  })

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify([...hidden])) } catch { /* ignore */ }
  }, [storageKey, hidden])

  const toggle = (key: string) => setHidden(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const reset = () => setHidden(new Set())

  return { hidden, toggle, reset }
}
