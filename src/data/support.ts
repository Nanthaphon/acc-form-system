import { supabase } from '../lib/supabase'
import type { Attachment } from '../types/schema'

// แชทแจ้งปัญหา: a conversation (ticket) between one person and the admins.
// Tables, triggers and the 'support' bucket: supabase/2026-11-02-support-chat.sql.
// Who sent a message, when, and the conversation's summary columns are all set
// by the database — what is sent from here for them is ignored.
export const SUPPORT_BUCKET = 'support'
export const MAX_SUPPORT_IMAGES = 4                  // per message
export const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024
export const SUPPORT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
export const SUPPORT_POLL_MS = 60_000                // unread badges
export const THREAD_POLL_MS = 10_000                 // an open conversation

export type SupportStatus = 'open' | 'doing' | 'done'

export const SUPPORT_STATUS: Record<SupportStatus, { label: string; tone: 'amber' | 'blue' | 'green' }> = {
  open: { label: 'ใหม่', tone: 'amber' },
  doing: { label: 'กำลังดำเนินการ', tone: 'blue' },
  done: { label: 'เสร็จแล้ว', tone: 'green' },
}

export interface SupportTicket {
  id: string
  createdBy: string
  reporterName: string
  subject: string
  page: string
  status: SupportStatus
  createdAt: number
  lastMessageAt: number | null
  lastByReporter: boolean
  lastPreview: string
  messageCount: number
  reporterReadAt: number
  staffReadAt: number
}

export interface SupportMessage {
  id: string
  ticketId: string
  fromUid: string
  fromName: string
  fromReporter: boolean
  body: string
  images: Attachment[]
  createdAt: number
}

// Has the other side written since this person last looked? `asStaff` reads
// it from the admins' side (a conversation the admin opened themselves is
// read from the reporter's side, like anyone else's own).
export function isUnread(t: SupportTicket, uid: string, asStaff: boolean): boolean {
  if (!t.lastMessageAt) return false
  if (t.createdBy === uid) return !t.lastByReporter && t.lastMessageAt > t.reporterReadAt
  return asStaff && t.lastByReporter && t.lastMessageAt > t.staffReadAt
}

// Until the SQL has been run, there are no tables: the button stays hidden
// and the admin page says what to run.
let available = true
export function supportAvailable(): boolean { return available }
function missingTable(e: { code?: string; message?: string }): boolean {
  return e.code === 'PGRST205' || e.code === '42P01' || /could not find the table|does not exist/i.test(e.message ?? '')
}
function fail(e: { code?: string; message?: string }): never {
  if (missingTable(e)) {
    available = false
    throw new Error('ระบบแชทแจ้งปัญหายังไม่พร้อม — ผู้ดูแลระบบต้องรัน supabase/2026-11-02-support-chat.sql ก่อน')
  }
  throw new Error(e.message || 'เกิดข้อผิดพลาด')
}

const TICKET_COLS = 'id,createdBy,reporterName,subject,page,status,createdAt,lastMessageAt,lastByReporter,lastPreview,messageCount,reporterReadAt,staffReadAt'

// One person's own conversations, newest activity first. Ones left empty (the
// first message never went through) are not shown.
export async function listMyTickets(uid: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase.from('support_tickets').select(TICKET_COLS)
    .eq('createdBy', uid).order('lastMessageAt', { ascending: false }).limit(100)
  if (error) fail(error)
  available = true
  return ((data ?? []) as SupportTicket[]).filter(t => t.lastMessageAt)
}

// Every conversation, for the admins' inbox.
export async function listAllTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase.from('support_tickets').select(TICKET_COLS)
    .order('lastMessageAt', { ascending: false }).limit(500)
  if (error) fail(error)
  available = true
  return ((data ?? []) as SupportTicket[]).filter(t => t.lastMessageAt)
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  const { data, error } = await supabase.from('support_tickets').select(TICKET_COLS).eq('id', id).maybeSingle()
  if (error) fail(error)
  return (data as SupportTicket | null) ?? null
}

// How many conversations wait on this person: replies to their own (`mine`,
// on the chat button), and — for an admin — anyone else's with a message
// nobody on the admin side has read yet (`inbox`, on the admin menu).
export async function unreadCounts(uid: string, asStaff: boolean): Promise<{ mine: number; inbox: number }> {
  let q = supabase.from('support_tickets').select('id,createdBy,lastMessageAt,lastByReporter,reporterReadAt,staffReadAt')
  if (!asStaff) q = q.eq('createdBy', uid)
  const { data, error } = await q.limit(500)
  if (error) { if (missingTable(error)) available = false; return { mine: 0, inbox: 0 } }
  available = true
  const rows = (data ?? []) as SupportTicket[]
  return {
    mine: rows.filter(t => t.createdBy === uid && isUnread(t, uid, asStaff)).length,
    inbox: rows.filter(t => t.createdBy !== uid && isUnread(t, uid, asStaff)).length,
  }
}

export async function listMessages(ticketId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase.from('support_messages').select('*')
    .eq('ticketId', ticketId).order('createdAt', { ascending: true })
  if (error) fail(error)
  return (data ?? []) as SupportMessage[]
}

// Opens a conversation. The subject is the first message's first line.
export async function createTicket(firstMessage: string, page: string): Promise<string> {
  const subject = firstMessage.trim().split('\n')[0].slice(0, 120) || 'แจ้งปัญหา (รูปภาพ)'
  const { data, error } = await supabase.from('support_tickets').insert({ subject, page }).select('id').single()
  if (error) fail(error)
  return (data as { id: string }).id
}

// May these files go into one message? A Thai message for the first rule
// broken, or null.
export function checkSupportImages(already: number, files: Array<{ name: string; size: number; type: string }>): string | null {
  if (already + files.length > MAX_SUPPORT_IMAGES) return `แนบรูปได้สูงสุด ${MAX_SUPPORT_IMAGES} รูปต่อข้อความ`
  const notImage = files.find(f => !SUPPORT_IMAGE_TYPES.includes(f.type))
  if (notImage) return `"${notImage.name}" ไม่ใช่รูปภาพ — แนบได้เฉพาะ PNG, JPG, GIF, WEBP`
  const tooBig = files.find(f => f.size > MAX_SUPPORT_IMAGE_BYTES)
  if (tooBig) return `รูป "${tooBig.name}" ใหญ่เกิน 5 MB`
  return null
}

function objectKey(ticketId: string, file: File): string {
  const ext = /\.([a-z0-9]{1,8})$/i.exec(file.name)?.[1]?.toLowerCase() ?? file.type.split('/')[1] ?? 'png'
  return `${ticketId}/${crypto.randomUUID()}.${ext}`
}

// Uploads the pictures, then writes the message. If anything fails, the
// pictures already stored are removed again and the error is re-thrown.
export async function sendMessage(ticketId: string, body: string, files: File[]): Promise<void> {
  const images: Attachment[] = []
  try {
    for (const file of files) {
      const path = objectKey(ticketId, file)
      const { error } = await supabase.storage.from(SUPPORT_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw error
      images.push({ path, name: file.name || 'รูปภาพ', size: file.size, type: file.type, uploadedAt: Date.now() })
    }
    const { error } = await supabase.from('support_messages').insert({ ticketId, body: body.trim(), images })
    if (error) fail(error)
  } catch (e) {
    if (images.length) { try { await supabase.storage.from(SUPPORT_BUCKET).remove(images.map(i => i.path)) } catch { /* leftover is harmless */ } }
    throw e
  }
}

export async function markRead(ticketId: string): Promise<void> {
  await supabase.rpc('support_mark_read', { ticket: ticketId })
}

export async function setTicketStatus(id: string, status: SupportStatus): Promise<void> {
  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id)
  if (error) fail(error)
}

// Deletes a conversation with its messages (admins only); its pictures are
// removed best-effort.
export async function deleteTicket(id: string, imagePaths: string[]): Promise<void> {
  const { error } = await supabase.from('support_tickets').delete().eq('id', id)
  if (error) fail(error)
  if (imagePaths.length) { try { await supabase.storage.from(SUPPORT_BUCKET).remove(imagePaths) } catch { /* ignore */ } }
}

// Short-lived links for showing pictures inline (path → url).
export async function imageUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data } = await supabase.storage.from(SUPPORT_BUCKET).createSignedUrls(paths, 3600)
  const out: Record<string, string> = {}
  for (const d of (data ?? []) as Array<{ path: string | null; signedUrl: string }>) if (d.path && d.signedUrl) out[d.path] = d.signedUrl
  return out
}
