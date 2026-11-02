import { useCallback, useEffect, useState } from 'react'
import { SUPPORT_POLL_MS, supportAvailable, unreadCounts } from '../data/support'

// Badges for แชทแจ้งปัญหา: replies waiting on the person's own conversations
// (the chat button) and, for an admin, conversations waiting on the admins
// (the รับเรื่องแจ้งปัญหา menu). Same rhythm as the รอเซ็น badge: refetched
// when something is read or sent in this tab, when the tab comes back to the
// front, and on a slow timer while it is visible.
const listeners = new Set<() => void>()
export function notifySupportChanged(): void { listeners.forEach(l => l()) }

export function useSupportUnread(uid: string | undefined, isAdmin: boolean, intervalMs = SUPPORT_POLL_MS) {
  const [counts, setCounts] = useState({ mine: 0, inbox: 0, available: false })

  const refresh = useCallback(() => {
    if (!uid) { setCounts({ mine: 0, inbox: 0, available: false }); return }
    // `available`: false until the SQL has been run — the chat button stays hidden
    unreadCounts(uid, isAdmin).then(c => setCounts({ ...c, available: supportAvailable() })).catch(() => {})
  }, [uid, isAdmin])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { listeners.add(refresh); return () => { listeners.delete(refresh) } }, [refresh])

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

  return counts
}
