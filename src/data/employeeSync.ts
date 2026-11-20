import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types/schema'

// The employee master (IT Asset Management, report.employees) → profiles.
// The work is done by the sync-employees edge function; see docs/central-employees.md.

export interface SyncSummary {
  dryRun: boolean
  ranAt: number
  centralCount: number
  updated: { employeeId: string; name: string; changed: string[] }[]
  unchanged: number
  notInCentral: { employeeId: string; name: string }[]
  notHere: { employeeId: string; name: string; company: string }[]   // no login yet: one is made
  created?: { employeeId: string; name: string }[]                     // logins made this run
  clashes?: { employeeId: string; name: string; existingEmployeeId: string }[]
  resigned: { employeeId: string; name: string; resignDate: string }[]
  unknownCompanies: string[]
  failed: { employeeId: string; error: string }[]
}

const SETUP = 'ดูขั้นตอนตั้งค่าที่ docs/central-employees.md'
// The function's own error codes, and what to do about each.
const ERRORS: Record<string, string> = {
  NOT_CONFIGURED: `ยังไม่ได้ใส่ค่าเชื่อมต่อระบบกลาง (CENTRAL_URL / CENTRAL_ANON_KEY / CENTRAL_FEED_TOKEN) ใน Edge Function Secrets — ${SETUP}`,
  MIGRATION_MISSING: 'ฐานข้อมูลยังไม่รองรับ — ผู้ดูแลระบบต้องรันไฟล์ supabase/2026-11-20-central-employees.sql ใน Supabase SQL Editor ก่อน',
  CENTRAL_EMPTY: 'ระบบกลางไม่ส่งรายชื่อพนักงานมาเลย จึงยังไม่ได้แก้อะไร — ลองใหม่ภายหลัง',
}

export function syncErrorMessage(code: string): string {
  if (ERRORS[code]) return ERRORS[code]
  if (/invalid token/i.test(code)) return `token ของระบบกลางไม่ถูกต้อง (CENTRAL_FEED_TOKEN) — ${SETUP}`
  if (/acc_employee_feed|PGRST202/i.test(code)) return `ระบบกลางยังไม่มีฟังก์ชัน acc_employee_feed — ให้รัน supabase/central/2026-11-20-acc-employee-feed.sql ในโปรเจค it-asset-management ก่อน`
  return code || 'ซิงก์ไม่สำเร็จ'
}

export async function syncEmployees(dryRun = false): Promise<SyncSummary> {
  const { data, error } = await supabase.functions.invoke<SyncSummary>('sync-employees', { body: { dryRun } })
  if (error) {
    // FunctionsHttpError carries the function's own answer; anything else means
    // the function is not there at all (not deployed yet).
    const res = (error as { context?: Response }).context
    let code = ''
    if (res && typeof res.json === 'function') {
      try { code = ((await res.json()) as { error?: string }).error ?? '' } catch { /* not json */ }
    }
    if (!code && (error.name === 'FunctionsFetchError' || res?.status === 404)) {
      throw new Error(`ยังไม่ได้ติดตั้ง Edge Function sync-employees — ${SETUP}`)
    }
    throw new Error(syncErrorMessage(code || error.message))
  }
  return data!
}

/** The master owns this field of this person: read-only here. */
export function centralOwns(p: Pick<UserProfile, 'centralFields'> | null | undefined, field: keyof UserProfile): boolean {
  return !!p?.centralFields?.includes(field)
}

/** A profile save without the fields the master owns: the database refuses a
 *  change to them, and an unchanged value has no reason to be sent. */
export function withoutCentral<T extends Partial<UserProfile>>(patch: T, p: Pick<UserProfile, 'centralFields'> | null | undefined): T {
  const owned = p?.centralFields ?? []
  if (owned.length === 0) return patch
  return Object.fromEntries(Object.entries(patch).filter(([k]) => !owned.includes(k))) as T
}


/** When the last sync ran (ms), or null. */
export async function lastSyncAt(): Promise<number | null> {
  try {
    const { data, error } = await supabase.from('employee_sync_runs').select('ranAt').order('ranAt', { ascending: false }).limit(1)
    if (error || !data?.length) return null
    return Number((data[0] as { ranAt: number }).ranAt)
  } catch {
    return null // no sync table yet: just no time shown
  }
}
