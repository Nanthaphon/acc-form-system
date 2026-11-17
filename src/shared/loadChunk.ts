import { uiAlert } from '../components/dialog/dialogService'

// A part of the app loaded only when needed (the Excel builder) lives in its own
// file, named by a hash of its content. Each release replaces those files, so a
// tab opened before the release asks for a file that no longer exists and the
// load fails ("Failed to fetch dynamically imported module …"). The cure is to
// load the page again, which brings the new names.
const PATTERNS = [
  /failed to fetch dynamically imported module/i,   // Chrome / Edge
  /error loading dynamically imported module/i,      // Firefox
  /importing a module script failed/i,               // Safari
  /is not a valid javascript mime type/i,
]
export function isChunkLoadError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  return PATTERNS.some(p => p.test(msg))
}

const KEY = 'chunk-reload-at'
const AGAIN_WITHIN_MS = 30_000

// Loads an on-demand part of the app. When it fails because a new version went
// live, says so and reloads the page — once: if it fails again right after a
// reload, the real error is passed on instead of reloading round and round.
export async function loadChunk<T>(load: () => Promise<T>, reload: () => void = () => window.location.reload()): Promise<T> {
  try {
    return await load()
  } catch (e) {
    if (!isChunkLoadError(e)) throw e
    let last = 0
    try { last = Number(sessionStorage.getItem(KEY)) || 0 } catch { /* no storage: still reload once */ }
    if (Date.now() - last < AGAIN_WITHIN_MS) throw e
    try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ }
    await uiAlert('ระบบเพิ่งอัปเดตเป็นเวอร์ชันใหม่ กด ตกลง เพื่อโหลดหน้าใหม่ แล้วลองอีกครั้ง', { title: 'มีเวอร์ชันใหม่' })
    reload()
    return new Promise<T>(() => {})   // the page is going away; nothing more to do here
  }
}
