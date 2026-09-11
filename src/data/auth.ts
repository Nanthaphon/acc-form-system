import { supabase } from '../lib/supabase'

const DOMAIN = 'globe.local'
// The login email is built from the employee ID. Characters an email address
// can't hold (e.g. the "@" in "Acc@GB") are written as +HEX; plain IDs (letters,
// digits, . _ -) come out unchanged, so existing logins keep working.
export function employeeIdToEmail(employeeId: string): string {
  const local = employeeId.trim().replace(/[^A-Za-z0-9._-]/gu, c => '+' + c.codePointAt(0)!.toString(16))
  return `${local}@${DOMAIN}`
}
export async function loginWithEmployeeId(employeeId: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: employeeIdToEmail(employeeId), password,
  })
  if (error) throw error
  return data
}
export async function logout() { await supabase.auth.signOut() }
export async function changeMyPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
