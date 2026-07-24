import { supabase } from '../lib/supabase'

const DOMAIN = 'globe.local'
export function employeeIdToEmail(employeeId: string): string {
  return `${employeeId.trim()}@${DOMAIN}`
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
