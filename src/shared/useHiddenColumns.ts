import { useEffect, useState } from 'react'

// Which table columns the viewer has hidden, remembered per table in this
// browser. Storage can be unavailable (private mode, blocked site data) — then
// every column simply starts visible.
export function useHiddenColumns(storageKey: string) {
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
      return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    } catch {
      return new Set()
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
