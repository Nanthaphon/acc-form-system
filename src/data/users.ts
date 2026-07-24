import { supabase, supabaseSecondary } from '../lib/supabase'
import { employeeIdToEmail } from './auth'
import type { UserProfile, Role } from '../types/schema'
import type { CsvEmployeeRow } from '../shared/csv'

export interface NewEmployee {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role
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
  // 2) insert the profile as the ADMIN (primary client)
  const profile: UserProfile = {
    uid, employeeId: e.employeeId, firstName: e.firstName, lastName: e.lastName,
    position: e.position, department: e.department, companyId: e.companyId,
    defaultJob: e.defaultJob, bankAccount: e.bankAccount, role: e.role,
    mustChangePassword: true, createdAt: Date.now(),
  }
  const { error: e2 } = await supabase.from('profiles').insert(profile)
  if (e2) throw e2
  return uid
}

export async function getProfileByUid(uid: string): Promise<UserProfile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('uid', uid).maybeSingle()
  return (data as UserProfile) ?? null
}
export async function listEmployees(): Promise<UserProfile[]> {
  const { data } = await supabase.from('profiles').select('*').order('employeeId')
  return (data ?? []) as UserProfile[]
}
export async function setMustChangePassword(uid: string, value: boolean): Promise<void> {
  await supabase.from('profiles').update({ mustChangePassword: value }).eq('uid', uid)
}
export async function updateProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  await supabase.from('profiles').update(patch).eq('uid', uid)
}
export async function importEmployees(rows: CsvEmployeeRow[]): Promise<{ ok: number; failed: { employeeId: string; reason: string }[] }> {
  let ok = 0; const failed: { employeeId: string; reason: string }[] = []
  for (const r of rows) {
    try { await createEmployee(r); ok++ }
    catch (e: any) { failed.push({ employeeId: r.employeeId, reason: e?.message || 'error' }) }
  }
  return { ok, failed }
}
