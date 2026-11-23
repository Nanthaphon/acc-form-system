// Where to go after signing in (or changing a first password): the page the
// person was trying to open — the document a mail linked to — rather than the
// home page. Only a path inside this app is taken: anything else (another
// site, "//evil.example", the login page itself) goes home, so a crafted link
// cannot send someone off the app after they sign in.
export function safeReturnPath(v: unknown): string {
  if (typeof v !== 'string' || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return '/'
  if (v === '/login' || v.startsWith('/login?') || v === '/change-password') return '/'
  return v
}

/** The router state that carries it: { from: '/submission/…/preview' }. */
export const fromState = (state: unknown): string =>
  safeReturnPath((state as { from?: unknown } | null)?.from)
