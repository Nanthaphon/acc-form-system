import { supabase, supabaseSecondary } from '../lib/supabase'
import { employeeIdToEmail } from './auth'
import type { UserProfile, Role } from '../types/schema'
import type { CsvEmployeeRow } from '../shared/csv'
import { notifyPendingSignChanged } from '../shared/pendingSignBus'

export interface NewEmployee {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role; accessGroup?: string
  email?: string
  mustChangePassword?: boolean   // ask for a new password on first login (default true)
}

// Supabase Auth answers a second sign-up for one email with this.
export function isAlreadyRegistered(e: unknown): boolean {
  const err = (e ?? {}) as { code?: string; message?: string }
  return err.code === 'user_already_exists' || err.code === 'email_exists' || /already (been )?registered/i.test(err.message ?? '')
}
const isMissingRpc = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message ?? ''))

// The ID as a LIKE pattern that matches only itself (case aside).
const exactLike = (s: string) => s.replace(/[\\%_]/g, c => '\\' + c)

/** Someone in the employee list already using this ID. Case is ignored:
 *  "ACC001" and "acc001" are one login email, so one account. */
async function findEmployeeById(employeeId: string): Promise<{ employeeId: string; name: string } | null> {
  const { data, error } = await supabase.from('profiles')
    .select('employeeId,firstName,lastName').ilike('employeeId', exactLike(employeeId))
  if (error) return null // cannot look: sign-up still refuses a real duplicate
  const p = ((data ?? []) as { employeeId: string; firstName?: string; lastName?: string }[])
    .find(r => String(r.employeeId).toLowerCase() === employeeId.toLowerCase())
  return p ? { employeeId: String(p.employeeId), name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() } : null
}

function alreadyEmployee(employeeId: string, p: { employeeId: string; name: string }): Error {
  const who = p.name || 'พนักงานคนอื่น'
  const taken = p.employeeId === employeeId
    ? `รหัสพนักงาน ${employeeId} เป็นของ ${who} อยู่แล้ว`
    : `รหัสพนักงาน ${employeeId} ซ้ำกับ ${p.employeeId} ของ ${who} (ตัวพิมพ์เล็ก/ใหญ่ถือเป็นรหัสเดียวกัน)`
  return new Error(`${taken} — ใช้รหัสอื่น หรือแก้ข้อมูลคนเดิมที่หน้ารายชื่อพนักงาน`)
}

/** A login account with this ID but no employee profile — left behind when an
 *  earlier add failed halfway — is deleted so the ID can be used again.
 *  'missing': the database has not run supabase/2026-11-16-orphan-login.sql. */
async function releaseOrphanLogin(employeeId: string): Promise<'free' | 'taken' | 'released' | 'missing'> {
  const { data, error } = await supabase.rpc('release_orphan_login', { employee_id: employeeId })
  if (isMissingRpc(error)) return 'missing'
  if (error) throw error
  return data as 'free' | 'taken' | 'released'
}

export async function createEmployee(e: NewEmployee): Promise<string> {
  const existing = await findEmployeeById(e.employeeId)
  if (existing) throw alreadyEmployee(e.employeeId, existing)

  // 1) create the auth user on the SECONDARY client (default password = employeeId)
  const signUp = () => supabaseSecondary.auth.signUp({
    email: employeeIdToEmail(e.employeeId),
    password: e.employeeId,
  })
  let { data, error } = await signUp()
  if (error && isAlreadyRegistered(error)) {
    const freed = await releaseOrphanLogin(e.employeeId)
    if (freed === 'missing') throw new Error(
      `รหัสพนักงาน ${e.employeeId} มีบัญชีเข้าสู่ระบบค้างอยู่จากการเพิ่มที่ไม่สำเร็จครั้งก่อน — ` +
      'ให้ผู้ดูแลระบบรันไฟล์ supabase/2026-11-16-orphan-login.sql ใน Supabase SQL Editor หนึ่งครั้ง แล้วกดบันทึกอีกครั้ง')
    if (freed === 'taken') throw new Error(
      `รหัสพนักงาน ${e.employeeId} มีบัญชีเข้าสู่ระบบอยู่แล้ว — ใช้รหัสอื่น หรือค้นหาคนเดิมในหน้ารายชื่อพนักงาน`)
    ;({ data, error } = await signUp())
  }
  if (error) throw error
  const uid = data.user!.id
  await supabaseSecondary.auth.signOut()
  // 2) insert the profile as the ADMIN (primary client). passwordIsDefault comes
  //    from its column default (true): the new login's password is the employee ID.
  const profile: UserProfile = {
    uid, employeeId: e.employeeId, firstName: e.firstName, lastName: e.lastName,
    position: e.position, department: e.department, companyId: e.companyId,
    defaultJob: e.defaultJob, bankAccount: e.bankAccount, role: e.role,
    accessGroup: e.accessGroup,
    // Only when given, so a database without the email column still takes new people.
    ...(e.email ? { email: e.email } : {}),
    mustChangePassword: e.mustChangePassword ?? true, createdAt: Date.now(),
  }
  let { error: e2 } = await supabase.from('profiles').insert(profile)
  // A database without the email column (supabase/2026-10-26-employee-email.sql
  // not run) refused the whole row whenever an email was typed — and left the
  // login behind. The person is added without it instead.
  if (e2 && e.email && (e2.code === 'PGRST204' || /'email' column/i.test(e2.message ?? ''))) {
    const { email: _skip, ...withoutEmail } = profile
    ;({ error: e2 } = await supabase.from('profiles').insert(withoutEmail))
  }
  if (e2) {
    // Undo step 1, so the ID is not left taken by a login nobody can see.
    await releaseOrphanLogin(e.employeeId).catch(() => undefined)
    throw e2
  }
  return uid
}

export async function getProfileByUid(uid: string): Promise<UserProfile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('uid', uid).maybeSingle()
  return (data as UserProfile) ?? null
}
// Every profile column except signatureImage (a base64 image per person) —
// lists only need names and details.
const EMPLOYEE_LIST_COLS = 'uid,employeeId,firstName,lastName,position,department,companyId,defaultJob,bankAccount,role,groupId,accessGroup,mustChangePassword,createdAt'
const EMPLOYEE_LOGIN_COLS = 'isSuperAdmin,passwordIsDefault'
const EMPLOYEE_EMAIL_COL = 'email'
export async function listEmployees(): Promise<UserProfile[]> {
  const q = (cols: string) => supabase.from('profiles').select(cols).order('employeeId')
  // Newer columns, each with the migration that adds it: a database that has not
  // run one still lists everyone, without that column.
  //   email — supabase/2026-10-26-employee-email.sql
  //   isSuperAdmin, passwordIsDefault — supabase/2026-09-11-super-admin.sql
  let { data, error } = await q(`${EMPLOYEE_LIST_COLS},${EMPLOYEE_LOGIN_COLS},${EMPLOYEE_EMAIL_COL}`)
  if (error?.code === '42703') ({ data, error } = await q(`${EMPLOYEE_LIST_COLS},${EMPLOYEE_LOGIN_COLS}`))
  if (error?.code === '42703') ({ data } = await q(EMPLOYEE_LIST_COLS))
  return (data ?? []) as unknown as UserProfile[]
}
// After someone sets their own password. Two writes, so the first still lands
// on a database that doesn't have the passwordIsDefault column yet.
export async function markOwnPasswordChanged(uid: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ mustChangePassword: false }).eq('uid', uid)
  if (error) throw error // otherwise the page says 'changed' and RequireAuth sends them straight back
  await supabase.from('profiles').update({ passwordIsDefault: false }).eq('uid', uid)
}
// Super Admin only (checked in the database): set anyone's login password.
export async function adminSetPassword(uid: string, password: string, mustChange: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_password', { target: uid, new_password: password, must_change: mustChange })
  if (error) throw error
}
// Super Admin only (checked in the database): rename someone's username —
// login, profile and documents together; a default password follows it.
export async function adminChangeUsername(uid: string, newUsername: string): Promise<void> {
  const { error } = await supabase.rpc('admin_change_username', { target: uid, new_username: newUsername })
  if (error) throw error
}
export async function updateProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('uid', uid)
  if (error) throw error
}
// Fully removes an employee: their login account, profile, and submissions.
// Runs a SECURITY DEFINER RPC (delete_employee) that checks admin + deletes the auth user.
export async function deleteEmployee(uid: string): Promise<void> {
  const { error } = await supabase.rpc('delete_employee', { target: uid })
  if (error) throw error
  notifyPendingSignChanged() // their documents went too
}
// Supabase Auth allows only so many sign-ups per IP in a short window (30 per
// 5 minutes unless raised under Authentication > Rate Limits). An import of
// 60 people runs straight into it, and every account after the limit used to
// fail outright. It is a wait, not an error: the allowance refills a little
// every few seconds, so a refused account is retried after a pause.
export function isRateLimited(e: unknown): boolean {
  const err = (e ?? {}) as { status?: number; code?: string; message?: string }
  return err.status === 429 || err.code === 'over_request_rate_limit' || /rate limit/i.test(err.message ?? '')
}

const RETRY_EVERY_S = 12
// Past this, the limit is not refilling at all and waiting longer only hides
// that from the person watching the screen.
const GIVE_UP_AFTER_S = 6 * 60

export interface ImportProgress {
  done: number
  total: number
  /** Seconds until the next try, while Supabase is refusing sign-ups. */
  waiting?: number
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function importEmployees(
  rows: CsvEmployeeRow[],
  onProgress?: (p: ImportProgress) => void,
): Promise<{ ok: number; failed: { employeeId: string; reason: string }[] }> {
  let ok = 0
  const failed: { employeeId: string; reason: string }[] = []
  const total = rows.length

  for (const [i, r] of rows.entries()) {
    onProgress?.({ done: i, total })
    let waited = 0
    for (;;) {
      try { await createEmployee(r); ok++; break }
      catch (e: any) {
        if (isRateLimited(e) && waited < GIVE_UP_AFTER_S) {
          for (let s = RETRY_EVERY_S; s > 0; s--) { onProgress?.({ done: i, total, waiting: s }); await sleep(1000) }
          waited += RETRY_EVERY_S
          continue
        }
        failed.push({ employeeId: r.employeeId, reason: e?.message || 'error' })
        break
      }
    }
  }
  onProgress?.({ done: total, total })
  return { ok, failed }
}

/** Every employee ID already in the system — so an import run twice, or re-run
 *  after a partial failure, skips the people it already created. */
export async function existingEmployeeIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('profiles').select('employeeId')
  if (error) throw error
  return new Set((data ?? []).map(p => String((p as { employeeId: string }).employeeId)))
}

/** Most people in an import file already have an account; the file still
 *  carries their email. Sets it for each existing employee whose address
 *  differs, and leaves everything else about them alone. */
export async function updateEmployeeEmails(
  rows: { employeeId: string; email?: string }[],
): Promise<{ updated: number; failed: { employeeId: string; reason: string }[] }> {
  const wanted = rows.filter(r => r.email)
  if (wanted.length === 0) return { updated: 0, failed: [] }
  const { data, error } = await supabase.from('profiles').select('uid,employeeId,email')
  if (error) throw error
  const byId = new Map((data ?? []).map(p => [String(p.employeeId), p as { uid: string; email: string | null }]))
  let updated = 0
  const failed: { employeeId: string; reason: string }[] = []
  for (const r of wanted) {
    const p = byId.get(r.employeeId)
    if (!p || p.email === r.email) continue
    const { error: e } = await supabase.from('profiles').update({ email: r.email }).eq('uid', p.uid)
    if (e) failed.push({ employeeId: r.employeeId, reason: e.message })
    else updated++
  }
  return { updated, failed }
}
