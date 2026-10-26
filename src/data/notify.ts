import { supabase } from '../lib/supabase'

export interface NotifyResult {
  sent: number
  /** Names of people with no email on their profile. */
  noEmail: string[]
  failed: string[]
}

/**
 * Emails the people a document was just sent to (supabase/functions/notify-signers).
 * Best effort: the sending has already happened, so a missing function, an
 * unconfigured mailbox or a network fault returns null and changes nothing.
 */
export async function notifySigners(submissionId: string, uids: string[]): Promise<NotifyResult | null> {
  if (uids.length === 0) return null
  try {
    const { data, error } = await supabase.functions.invoke<NotifyResult>('notify-signers', { body: { submissionId, uids } })
    return error || !data ? null : data
  } catch {
    return null
  }
}

/** One line for the "sent" message, or '' when there is nothing worth saying. */
export function notifySummary(r: NotifyResult | null): string {
  if (!r) return ''
  const parts = [
    r.sent > 0 && `แจ้งทางอีเมลแล้ว ${r.sent} คน`,
    r.noEmail.length > 0 && `${r.noEmail.join(', ')} ยังไม่มีอีเมลในระบบ`,
    r.failed.length > 0 && `ส่งอีเมลถึง ${r.failed.join(', ')} ไม่สำเร็จ`,
  ].filter(Boolean)
  return parts.join(' · ')
}
