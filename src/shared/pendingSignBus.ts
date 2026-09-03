// Tiny pub/sub so the sidebar "รอฉันเซ็น" badge refreshes the moment a signature
// action happens anywhere (signing, assigning signers, cancelling a request) —
// the count is otherwise only fetched once when the profile loads.
const listeners = new Set<() => void>()

export function onPendingSignChanged(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function notifyPendingSignChanged(): void {
  listeners.forEach(l => l())
}
