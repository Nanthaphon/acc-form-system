import { supabase } from '../lib/supabase'
import type { Attachment } from '../types/schema'

// Files attached to a document live in a private Storage bucket under
// `<submissionId>/<uuid>.<ext>`; the submission row keeps the metadata list.
export const ATTACHMENT_BUCKET = 'attachments'
export const MAX_ATTACHMENTS = 5
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024          // per file
export const MAX_ATTACHMENTS_TOTAL_BYTES = 25 * 1024 * 1024  // all files on one document

// May `adding` be attached next to the files already on a document (their
// sizes)? Returns a Thai message for the first rule broken, or null if allowed.
export function checkAttachmentLimits(existingSizes: number[], adding: Array<{ name: string; size: number }>): string | null {
  if (existingSizes.length + adding.length > MAX_ATTACHMENTS) {
    return `แนบไฟล์ได้สูงสุด ${MAX_ATTACHMENTS} ไฟล์ (มีอยู่แล้ว ${existingSizes.length} ไฟล์)`
  }
  const tooBig = adding.find(f => f.size > MAX_ATTACHMENT_BYTES)
  if (tooBig) return `ไฟล์ "${tooBig.name}" ขนาด ${formatBytes(tooBig.size)} — เกิน ${formatBytes(MAX_ATTACHMENT_BYTES)} ต่อไฟล์`
  const total = [...existingSizes, ...adding.map(f => f.size)].reduce((a, b) => a + b, 0)
  if (total > MAX_ATTACHMENTS_TOTAL_BYTES) return `ขนาดไฟล์รวม ${formatBytes(total)} — เกิน ${formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)}`
  return null
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${Number((n / (1024 * 1024)).toFixed(1))} MB` // "5 MB", "1.5 MB" — no trailing ".0"
}

// Storage keys stay ASCII (the original — often Thai — name lives in the
// metadata instead), so only the extension is carried over from the file name.
function objectKey(subId: string, fileName: string): string {
  const ext = /\.([a-z0-9]{1,8})$/i.exec(fileName)?.[1]?.toLowerCase()
  return `${subId}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`
}

// Upload files for a saved document. All-or-nothing: if one upload fails, the
// ones already stored are removed again and the error is re-thrown.
export async function uploadAttachments(subId: string, files: File[]): Promise<Attachment[]> {
  const done: Attachment[] = []
  try {
    for (const file of files) {
      const path = objectKey(subId, file.name)
      const { error } = await supabase.storage.from(ATTACHMENT_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (error) throw error
      done.push({ path, name: file.name, size: file.size, type: file.type, uploadedAt: Date.now() })
    }
    return done
  } catch (e) {
    await deleteAttachmentFiles(done.map(a => a.path))
    throw e
  }
}

// Best-effort removal: a leftover file is harmless, and a failed delete must
// never block the user's own action (saving, deleting a document).
export async function deleteAttachmentFiles(paths: string[]): Promise<void> {
  if (!paths.length) return
  try { await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths) } catch { /* ignore */ }
}

export async function saveAttachmentList(subId: string, list: Attachment[]): Promise<void> {
  const { error } = await supabase.from('submissions').update({ attachments: list }).eq('id', subId)
  if (error) throw error
}

// Open a stored file in a new tab through a short-lived signed URL. The tab is
// opened before the await so popup blockers still treat it as user-initiated.
export async function openAttachment(path: string): Promise<void> {
  const win = window.open('', '_blank')
  if (win) win.opener = null
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 300)
  if (error || !data?.signedUrl) {
    win?.close()
    throw error ?? new Error('signed url unavailable')
  }
  if (win) win.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}
