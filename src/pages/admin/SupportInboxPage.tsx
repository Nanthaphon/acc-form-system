import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListSkeleton } from '../../components/TableSkeleton'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Headset, MessagesSquare, Search, Trash2 } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import {
  deleteTicket, isUnread, listAllTickets, listMessages, setTicketStatus, supportAvailable,
  SUPPORT_POLL_MS, SUPPORT_STATUS,
} from '../../data/support'
import type { SupportStatus, SupportTicket } from '../../data/support'
import SupportThread from '../../components/support/SupportThread'
import { notifySupportChanged } from '../../shared/useSupportUnread'
import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { PageHeader, ui } from '../../components/ui'
import { formatDateTime } from '../../shared/date'
import { AVATAR_TONE, initialOf } from '../../shared/initials'

type Filter = 'all' | SupportStatus
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'open', label: SUPPORT_STATUS.open.label },
  { value: 'doing', label: SUPPORT_STATUS.doing.label },
  { value: 'done', label: SUPPORT_STATUS.done.label },
]
const STATUSES: SupportStatus[] = ['open', 'doing', 'done']

// The status as the document status reads: grey words behind a small dot.
const STATUS_DOT: Record<SupportStatus, string> = { open: 'bg-ochre-500', doing: 'bg-clay-600', done: 'bg-olive-600' }
function StatusText({ status }: { status: SupportStatus }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-stone-600">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />{SUPPORT_STATUS[status].label}
    </span>
  )
}

// A segmented control: the picked one a white chip on a grey track.
const SEG_TRACK = 'flex rounded-lg bg-stone-100 p-0.5'
const segItem = (on: boolean) => `whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${on ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`

// Today: the time. Before: the day and month — the full date is on hover.
function shortWhen(ms: number | null): string {
  if (!ms) return ''
  const d = new Date(ms), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// รับเรื่องแจ้งปัญหา: every conversation opened from the chat button. The list
// on the left, the chosen conversation on the right; replying, moving it along
// (ใหม่ → กำลังดำเนินการ → เสร็จแล้ว) and deleting it happen here.
export default function SupportInboxPage() {
  const { profile } = useAuth()
  const uid = profile?.uid ?? ''
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('t')

  const load = useCallback(async () => {
    try { setTickets(await listAllTickets()); setError('') }
    catch (e) { setTickets([]); setError(e instanceof Error ? e.message : 'โหลดรายการไม่สำเร็จ') }
  }, [])

  useEffect(() => {
    load()
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const timer = setInterval(tick, SUPPORT_POLL_MS / 2)
    return () => clearInterval(timer)
  }, [load])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, open: 0, doing: 0, done: 0 }
    for (const t of tickets ?? []) { c.all++; c[t.status]++ }
    return c
  }, [tickets])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (tickets ?? []).filter(t => (filter === 'all' || t.status === filter)
      && (!q || `${t.subject} ${t.reporterName} ${t.lastPreview}`.toLowerCase().includes(q)))
  }, [tickets, filter, query])

  const selected = tickets?.find(t => t.id === selectedId) ?? null
  const select = (id: string | null) => {
    setParams(id ? { t: id } : {}, { replace: true })
    // read the moment it is opened (the database is told by the conversation itself)
    if (id) setTickets(list => list?.map(x => (x.id === id ? { ...x, staffReadAt: Date.now(), reporterReadAt: Date.now() } : x)) ?? null)
  }

  async function changeStatus(t: SupportTicket, status: SupportStatus) {
    if (t.status === status) return
    setTickets(list => list?.map(x => (x.id === t.id ? { ...x, status } : x)) ?? null)
    try { await setTicketStatus(t.id, status) }
    catch (e) { uiAlert(e instanceof Error ? e.message : 'เปลี่ยนสถานะไม่สำเร็จ'); load() }
  }

  async function remove(t: SupportTicket) {
    if (!(await uiConfirm('ข้อความและรูปทั้งหมดในเรื่องนี้จะถูกลบถาวร', { title: `ลบเรื่อง "${t.subject}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try {
      const images = (await listMessages(t.id)).flatMap(m => m.images ?? []).map(i => i.path)
      await deleteTicket(t.id, images)
      select(null)
      notifySupportChanged()
      load()
    } catch (e) { uiAlert(e instanceof Error ? e.message : 'ลบไม่สำเร็จ') }
  }

  return (
    <div>
      <PageHeader icon={<Headset size={20} />} title="รับเรื่องแจ้งปัญหา" subtitle={tickets ? `${counts.all} เรื่อง · ใหม่ ${counts.open}` : undefined} />

      {error ? (
        <div className="rounded-lg border border-ochre-200 bg-ochre-50 px-4 py-3 text-sm text-ochre-700">{error}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(320px,400px)_1fr]">
          {/* list */}
          <div className={`${ui.card} flex flex-col !p-0 lg:h-[calc(100vh-9.5rem)] ${selected ? 'hidden lg:flex' : ''}`}>
            <div className="space-y-3 border-b border-stone-200 p-3">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาชื่อ หรือเรื่อง" aria-label="ค้นหา"
                  className={`${ui.input} !rounded-lg pl-9`} />
              </div>
              <div className={`${SEG_TRACK} flex-wrap`} role="tablist">
                {FILTERS.map(f => (
                  <button key={f.value} type="button" role="tab" aria-selected={filter === f.value} onClick={() => setFilter(f.value)}
                    className={`${segItem(filter === f.value)} flex-1`}>
                    {f.label} <span className="tabular-nums text-stone-400">{counts[f.value]}</span>
                  </button>
                ))}
              </div>
            </div>
            <ul className="scroll-slim min-h-0 flex-1 divide-y divide-stone-100 overflow-y-auto">
              {tickets === null ? (
                <ListSkeleton rows={4} />
              ) : shown.length === 0 ? (
                <li className="py-10 text-center text-sm text-stone-500">ไม่มีเรื่อง</li>
              ) : shown.map(t => {
                const fresh = isUnread(t, uid, true)
                const on = t.id === selectedId
                // The last message only when it says more than the subject does.
                const preview = t.lastPreview && t.lastPreview.trim() !== t.subject.trim()
                  ? `${t.lastByReporter ? '' : 'ตอบแล้ว: '}${t.lastPreview}` : ''
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => select(t.id)} aria-current={on || undefined}
                      className={`relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${on ? 'bg-stone-50' : 'hover:bg-stone-50/70'}`}>
                      {on && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-clay-600" />}
                      <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${AVATAR_TONE}`}>
                        {initialOf(t.reporterName) || '?'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`min-w-0 flex-1 truncate text-sm ${fresh ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}>{t.reporterName || 'ไม่ระบุชื่อ'}</span>
                          <span className="shrink-0 text-[11px] text-stone-500" title={formatDateTime(t.lastMessageAt)}>{shortWhen(t.lastMessageAt)}</span>
                          {fresh && <span className="h-2 w-2 shrink-0 rounded-full bg-clay-600" aria-label="ยังไม่ได้อ่าน" />}
                        </span>
                        <span className={`block truncate text-sm ${fresh ? 'text-stone-900' : 'text-stone-600'}`}>{t.subject}</span>
                        <span className="mt-1 flex items-center gap-2">
                          <StatusText status={t.status} />
                          {preview && <span className="min-w-0 truncate text-xs text-stone-400">· {preview}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* conversation */}
          <div className={`${ui.card} flex min-h-[420px] flex-col overflow-hidden !p-0 lg:h-[calc(100vh-9.5rem)] ${selected ? '' : 'hidden lg:flex'}`}>
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 px-5 py-3.5">
                  <button type="button" onClick={() => select(null)} aria-label="กลับไปรายการ" className={`${ui.btnGhost} !px-2 lg:hidden`}><ArrowLeft size={16} /></button>
                  <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${AVATAR_TONE}`}>
                    {initialOf(selected.reporterName) || '?'}
                  </span>
                  <div className="min-w-[12rem] flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-stone-900" title={selected.subject}>{selected.subject}</h2>
                    {/* each piece kept whole: a narrow header wraps between them, never inside a name or date */}
                    <p className="flex flex-wrap gap-x-1.5 text-xs text-stone-500">
                      <span className="whitespace-nowrap">{selected.reporterName || 'ไม่ระบุชื่อ'}</span>
                      <span className="whitespace-nowrap">· แจ้งเมื่อ {formatDateTime(selected.createdAt)}</span>
                      {selected.page && <span className="whitespace-nowrap">· จากหน้า <span className="font-mono">{selected.page}</span></span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={SEG_TRACK} role="radiogroup" aria-label="สถานะ">
                      {STATUSES.map(s => (
                        <button key={s} type="button" role="radio" aria-checked={selected.status === s} onClick={() => changeStatus(selected, s)}
                          className={`${segItem(selected.status === s)} inline-flex items-center gap-1.5`}>
                          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />{SUPPORT_STATUS[s].label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => remove(selected)} aria-label="ลบเรื่องนี้" title="ลบเรื่องนี้"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-rose-50 hover:text-brick-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <SupportThread key={selected.id} ticketId={selected.id} viewerUid={uid} onSent={load} />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400"><MessagesSquare size={22} /></span>
                <span className="text-sm text-stone-500">
                  {tickets && tickets.length === 0 && supportAvailable() ? 'ยังไม่มีเรื่องแจ้งปัญหา' : 'เลือกเรื่องทางซ้ายเพื่อดูและตอบ'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
