import { useCallback, useEffect, useState } from 'react'
import { countMyPendingToSign } from '../data/submissions'
import { onPendingSignChanged } from './pendingSignBus'

// Someone else can send a document for signing at any moment, so this count has
// to keep itself current: it was previously read once when the profile loaded,
// which left the sidebar badge empty until the page was reloaded. It refetches
// when a signature action happens in this tab, when the tab comes back to the
// front, and on a slow timer while the tab is visible.
export const PENDING_SIGN_POLL_MS = 60_000

export function usePendingSignCount(uid: string | undefined, intervalMs = PENDING_SIGN_POLL_MS): number {
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (!uid) { setCount(0); return }
    // A failed poll (offline, a hiccup) just leaves the last known count alone.
    countMyPendingToSign(uid).then(setCount).catch(() => {})
  }, [uid])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => onPendingSignChanged(refresh), [refresh])

  useEffect(() => {
    if (!uid) return
    const whenVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', whenVisible)
    window.addEventListener('focus', whenVisible)
    const timer = setInterval(whenVisible, intervalMs)
    return () => {
      document.removeEventListener('visibilitychange', whenVisible)
      window.removeEventListener('focus', whenVisible)
      clearInterval(timer)
    }
  }, [uid, intervalMs, refresh])

  return count
}
