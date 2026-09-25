import { supabase, supabaseSecondary } from '../lib/supabase'
import { employeeIdToEmail } from './auth'
import type { UserProfile, Role } from '../types/schema'
import type { CsvEmployeeRow } from '../shared/csv'

export interface NewEmployee {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role; accessGroup?: string
  mustChangePassword?: boolean   // ask for a new password on first login (default true)
}

export async function createEmployee(e: NewEmployee): Promise<string> {
  // 1) create the auth user on the SECONDARY client (default password = employeeId)
  const { data, error } = await supabaseSecondary.auth.signUp({
    email: employeeIdToEmail(e.employeeId),
    password: e.employeeId,
  })
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
    mustChangePassword: e.mustChangePassword ?? true, createdAt: Date.now(),
  }
  const { error: e2 } = await supabase.from('profiles').insert(profile)
  if (e2) throw e2
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
export async function listEmployees(): Promise<UserProfile[]> {
  const q = (cols: string) => supabase.from('profiles').select(cols).order('employeeId')
  let { data, error } = await q(`${EMPLOYEE_LIST_COLS},${EMPLOYEE_LOGIN_COLS}`)
  // Those two columns exist only once supabase/2026-09-11-super-admin.sql has been run.
  if (error?.code === '42703') ({ data } = await q(EMPLOYEE_LIST_COLS))
  return (data ?? []) as unknown as UserProfile[]
}
// After someone sets their own password. Two writes, so the first still lands
// on a database that doesn't have the passwordIsDefault column yet.
export async function markOwnPasswordChanged(uid: string): Promise<void> {
  await supabase.from('profiles').update({ mustChangePassword: false }).eq('uid', uid)
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
