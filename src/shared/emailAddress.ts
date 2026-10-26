// An employee's real mailbox — where "please sign" notices go. Not the login:
// logins stay employeeId@globe.local (see data/auth), so a typo here can never
// lock anyone out.

/** Stored spelling: no spaces, lower case. '' when nothing was given. */
export const normalizeEmail = (v: unknown) => String(v ?? '').trim().toLowerCase()

/** Good enough to catch a slip of the keyboard; the mail server has the last word. */
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

/** The message for a value that is not empty and not an address, else null. */
export function emailProblem(v: unknown): string | null {
  const e = normalizeEmail(v)
  return e && !isValidEmail(e) ? `อีเมล "${e}" ไม่ถูกต้อง` : null
}
