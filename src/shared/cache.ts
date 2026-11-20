// Lists that every page asks for again — forms, folders, access groups,
// companies, signers, the employee list — kept in memory for a while, so
// moving between pages does not wait on the same requests each time.
//
// Every function that changes one of these lists clears it (invalidate), so
// what was just saved shows at once. A sign-in or sign-out clears everything
// (AuthProvider): the next person never sees the last one's lists. Requests for
// the same list at the same moment share one round trip.
//
// Off under tests: each test sets up its own database answers, which a list
// remembered from the test before would hide.

interface Entry { at: number; value: Promise<unknown> }
const store = new Map<string, Entry>()
const ON = import.meta.env.MODE !== 'test'

// An empty list is often a read that failed quietly (listForms answers [] on
// an error): not worth keeping for minutes.
const worthKeeping = (v: unknown) => !(Array.isArray(v) && v.length === 0)

export const MINUTE = 60_000

export function cached<T>(key: string, ttlMs: number, fetch: () => Promise<T>, enabled = ON): Promise<T> {
  if (!enabled) return fetch()
  const now = Date.now()
  const hit = store.get(key)
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>
  const value = fetch()
  const entry: Entry = { at: now, value }
  store.set(key, entry)
  const drop = () => { if (store.get(key) === entry) store.delete(key) }
  value.then(v => { if (!worthKeeping(v)) drop() }, drop)
  return value
}

/** Forget these lists; the next read fetches them again. */
export function invalidate(...keys: string[]) {
  for (const k of keys) {
    for (const key of [...store.keys()]) if (key === k || key.startsWith(`${k}:`)) store.delete(key)
  }
}

export function clearCache() { store.clear() }
