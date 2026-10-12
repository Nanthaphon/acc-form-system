import { useEffect, useState } from 'react'
import { ANNOUNCEMENTS_SEEN_EVENT, hasUnreadAnnouncement } from './announcements'

// Whether there is an announcement this browser has not read. It answers again
// when the announcements page marks itself read, and when another tab does.
export function useUnreadAnnouncement(): boolean {
  const [unread, setUnread] = useState(hasUnreadAnnouncement)
  useEffect(() => {
    const check = () => setUnread(hasUnreadAnnouncement())
    window.addEventListener(ANNOUNCEMENTS_SEEN_EVENT, check)
    window.addEventListener('storage', check)
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_SEEN_EVENT, check)
      window.removeEventListener('storage', check)
    }
  }, [])
  return unread
}
