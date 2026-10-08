import { useEffect, useState } from 'react'
import { signedImageUrls } from '../data/attachments'

// Signed URLs for stored pictures, fetched once per path and kept while the
// page is open; `extra` (pending pictures' local previews) is merged in.
export function useImageUrls(paths: string[], extra?: Record<string, string>): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = [...new Set(paths)].sort().join('|')
  useEffect(() => {
    const missing = key ? key.split('|').filter(p => !(p in urls)) : []
    if (!missing.length) return
    let live = true
    signedImageUrls(missing).then(got => { if (live) setUrls(u => ({ ...u, ...got })) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return extra ? { ...urls, ...extra } : urls
}
