import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { ImagePlus, SendHorizontal, X } from 'lucide-react'
import {
  checkSupportImages, createTicket, imageUrls, listMessages, markRead, sendMessage,
  MAX_SUPPORT_IMAGES, SUPPORT_IMAGE_TYPES, THREAD_POLL_MS,
} from '../../data/support'
import type { SupportMessage } from '../../data/support'
import { notifySupportChanged } from '../../shared/useSupportUnread'
import { uiAlert } from '../dialog/dialogService'
import { Spinner } from '../Spinner'
import { formatDateTime } from '../../shared/date'

interface Props {
  ticketId: string | null         // null: a new conversation, opened by the first message
  viewerUid: string
  page?: string                   // where a new conversation was opened from
  onCreated?: (id: string) => void
  onSent?: () => void
  disabled?: boolean
}

// One conversation: its messages, newest at the bottom, and the box to write
// the next one — with pictures picked, dropped or pasted (Ctrl+V a screenshot).
// Used by the chat button and by the admins' inbox alike.
export default function SupportThread({ ticketId, viewerUid, page = '', onCreated, onSent, disabled }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(!!ticketId)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // A conversation opened whose first message then failed: the retry goes into it.
  const openedRef = useRef<string | null>(null)

  const load = useCallback(async (id: string) => {
    try {
      const list = await listMessages(id)
      setMessages(prev => (prev.length === list.length && prev.at(-1)?.id === list.at(-1)?.id ? prev : list))
      const unread = list.some(m => m.fromUid !== viewerUid)
      if (unread) markRead(id).then(notifySupportChanged).catch(() => {})
    } catch { /* keep what is shown */ }
    setLoading(false)
  }, [viewerUid])

  useEffect(() => {
    setMessages([]); setText(''); setFiles([]); openedRef.current = null
    if (!ticketId) { setLoading(false); return }
    setLoading(true)
    load(ticketId)
    const tick = () => { if (document.visibilityState === 'visible') load(ticketId) }
    const timer = setInterval(tick, THREAD_POLL_MS)
    return () => clearInterval(timer)
  }, [ticketId, load])

  // Signed links for pictures not seen yet.
  useEffect(() => {
    const missing = messages.flatMap(m => m.images ?? []).map(i => i.path).filter(p => !urls[p])
    if (!missing.length) return
    imageUrls(missing).then(got => setUrls(u => ({ ...u, ...got }))).catch(() => {})
  }, [messages, urls])

  // Newest message in view.
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  // The box grows with the text, up to a few lines.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight + 2, 160)}px`
  }, [text])

  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews])

  function add(list: File[]) {
    const images = list.filter(f => f.type.startsWith('image/'))
    if (!images.length) {
      if (list.length) uiAlert('แนบได้เฉพาะรูปภาพ (PNG, JPG, GIF, WEBP)', { title: 'แนบไฟล์ไม่ได้' })
      return
    }
    const err = checkSupportImages(files.length, images)
    if (err) { uiAlert(err, { title: 'แนบรูปไม่ได้' }); return }
    setFiles(f => [...f, ...images])
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = Array.from(e.clipboardData?.files ?? [])
    if (!pasted.length) return
    e.preventDefault()
    // A pasted screenshot comes as "image.png"; give it a name worth keeping.
    add(pasted.map((f, i) => (f.name && f.name !== 'image.png') ? f
      : new File([f], `ภาพหน้าจอ-${Date.now()}${i ? `-${i}` : ''}.png`, { type: f.type })))
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() }
  }

  const canSend = !sending && !disabled && (text.trim().length > 0 || files.length > 0)

  async function send() {
    if (!canSend) return
    setSending(true)
    try {
      let id = ticketId ?? openedRef.current
      if (!id) { id = await createTicket(text, page); openedRef.current = id }
      await sendMessage(id, text, files)
      setText(''); setFiles([])
      notifySupportChanged()
      if (!ticketId) onCreated?.(id)
      else { await load(id); onSent?.() }
    } catch (e) {
      uiAlert(e instanceof Error ? e.message : 'ส่งข้อความไม่สำเร็จ', { title: 'ส่งไม่สำเร็จ' })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={e => { if (!disabled && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) add(Array.from(e.dataTransfer.files)) }}
    >
      <div ref={listRef} className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto bg-stone-50/70 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500"><Spinner size={16} /> กำลังโหลด...</div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-sm text-stone-500">
            เล่าปัญหาที่พบ แนบภาพหน้าจอได้
            <span className="mt-1 block text-xs">วางภาพด้วย Ctrl+V หรือลากไฟล์มาวาง</span>
          </div>
        ) : messages.map(m => {
          const mine = m.fromUid === viewerUid
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {!mine && (
                <span className="mb-1 px-1 text-xs font-medium text-stone-600">
                  {m.fromName || 'ไม่ระบุชื่อ'}{!m.fromReporter && <span className="ml-1.5 text-clay-700">· ผู้ดูแลระบบ</span>}
                </span>
              )}
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? 'bg-clay-600 text-white' : 'border border-stone-200 bg-white text-stone-800'}`}>
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {(m.images?.length ?? 0) > 0 && (
                  <div className={`grid gap-1.5 ${m.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${m.body ? 'mt-2' : ''}`}>
                    {m.images.map(img => (
                      <a key={img.path} href={urls[img.path] || undefined} target="_blank" rel="noreferrer" title={img.name}
                        className="block overflow-hidden rounded-md bg-stone-100">
                        {urls[img.path]
                          ? <img src={urls[img.path]} alt={img.name} className="max-h-48 w-full object-cover" />
                          : <div className="flex h-24 items-center justify-center"><Spinner size={14} /></div>}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1 px-1 text-[11px] text-stone-500">{formatDateTime(m.createdAt)}</span>
            </div>
          )
        })}
      </div>

      {!disabled && (
        <div className="border-t border-stone-200 bg-white p-3">
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={`${i}-${f.name}`} className="relative h-16 w-16 overflow-hidden rounded-md border border-stone-200">
                  <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
                  <button type="button" aria-label={`เอารูป ${f.name} ออก`} onClick={() => setFiles(list => list.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900/70 text-white hover:bg-stone-900">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={files.length >= MAX_SUPPORT_IMAGES || sending}
              title={`แนบรูป (สูงสุด ${MAX_SUPPORT_IMAGES} รูป)`} aria-label="แนบรูป"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-clay-700 disabled:text-stone-300">
              <ImagePlus size={20} />
            </button>
            <input ref={fileRef} type="file" accept={SUPPORT_IMAGE_TYPES.join(',')} multiple className="hidden"
              onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = '' }} />
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              aria-label="ข้อความ"
              placeholder={ticketId ? 'พิมพ์ข้อความ...' : 'พบปัญหาอะไร เล่าให้ฟังได้เลย...'}
              className="scroll-slim max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-clay-600 focus:outline-none focus:ring-2 focus:ring-clay-600/15"
            />
            <button type="button" onClick={send} disabled={!canSend} aria-label="ส่ง" title="ส่ง (Enter)"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-clay-600 text-white transition-colors hover:bg-clay-700 disabled:bg-stone-200 disabled:text-stone-400">
              {sending ? <Spinner size={16} /> : <SendHorizontal size={18} />}
            </button>
          </div>
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-clay-500 bg-clay-50/90 text-sm font-medium text-clay-700">
          วางรูปที่นี่
        </div>
      )}
    </div>
  )
}
