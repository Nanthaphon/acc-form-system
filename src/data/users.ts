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
export async function importEmployees(rows: CsvEmployeeRow[]): Promise<{ ok: number; failed: { employeeId: string; reason: string }[] }> {
  let ok = 0; const failed: { employeeId: string; reason: string }[] = []
  for (const r of rows) {
    try { await createEmployee(r); ok++ }
    catch (e: any) { failed.push({ employeeId: r.employeeId, reason: e?.message || 'error' }) }
  }
  return { ok, failed }
}
