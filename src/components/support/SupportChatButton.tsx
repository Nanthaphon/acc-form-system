import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowLeft, MessageCircleQuestion, Plus, X } from 'lucide-react'
import { listMyTickets, isUnread, SUPPORT_STATUS } from '../../data/support'
import type { SupportTicket } from '../../data/support'
import SupportThread from './SupportThread'
import { Badge } from '../ui'
import { Spinner } from '../Spinner'
import { formatDateTime } from '../../shared/date'

// The chat button at the bottom right of every page: tell the admins about a
// problem, with screenshots, and read their replies. Opens on the person's
// own conversations; with none yet, straight onto a new one.
export default function SupportChatButton({ uid, unread }: { uid: string; unread: number }) {
  const [open, setOpen] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  // null: the list · '' : a new conversation · an id: that conversation
  const [current, setCurrent] = useState<string | null>(null)
  const { pathname } = useLocation()

  async function refresh(): Promise<SupportTicket[]> {
    const list = await listMyTickets(uid).catch(() => [] as SupportTicket[])
    setTickets(list)
    return list
  }

  useEffect(() => {
    if (!open) return
    refresh().then(list => setCurrent(c => (c === null && list.length === 0 ? '' : c)))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const ticket = current ? tickets?.find(t => t.id === current) : undefined

  return (
    <div className="no-print">
      {open && (
        <section
          role="dialog"
          aria-label="แจ้งปัญหาถึงผู้ดูแลระบบ"
          className="fixed bottom-24 right-4 z-[60] flex h-[min(600px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_12px_40px_-8px_rgba(22,32,36,0.35)] sm:right-6"
        >
          <header className="flex items-center gap-2 bg-clay-900 px-3 py-3 text-white">
            {current !== null && (tickets?.length ?? 0) > 0 && (
              <button type="button" onClick={() => { setCurrent(null); refresh() }} aria-label="กลับไปรายการเรื่อง"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-clay-100 hover:bg-white/10">
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="min-w-0 flex-1 px-1">
              <h2 className="truncate text-sm font-semibold">
                {current === null ? 'แจ้งปัญหาถึงผู้ดูแลระบบ' : current === '' ? 'แจ้งปัญหาใหม่' : (ticket?.subject || 'เรื่องที่แจ้ง')}
              </h2>
              {ticket && <p className="text-xs text-clay-200">{SUPPORT_STATUS[ticket.status].label} · แจ้งเมื่อ {formatDateTime(ticket.createdAt)}</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="ปิด"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-clay-100 hover:bg-white/10">
              <X size={18} />
            </button>
          </header>

          {current === null ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-stone-200 p-3">
                <button type="button" onClick={() => setCurrent('')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-clay-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-clay-700">
                  <Plus size={16} /> แจ้งปัญหาใหม่
                </button>
              </div>
              <ul className="scroll-slim min-h-0 flex-1 divide-y divide-stone-100 overflow-y-auto">
                {tickets === null ? (
                  <li className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500"><Spinner size={16} /> กำลังโหลด...</li>
                ) : tickets.map(t => {
                  const fresh = isUnread(t, uid, false)
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => setCurrent(t.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-stone-50">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${fresh ? 'bg-brick-500' : 'bg-transparent'}`} aria-label={fresh ? 'มีคำตอบใหม่' : undefined} />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm ${fresh ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}>{t.subject}</span>
                          <span className="block truncate text-xs text-stone-500">{t.lastByReporter ? 'คุณ: ' : 'ผู้ดูแล: '}{t.lastPreview}</span>
                          <span className="mt-1 flex items-center gap-2 text-[11px] text-stone-500">
                            <span className="shrink-0 whitespace-nowrap"><Badge tone={SUPPORT_STATUS[t.status].tone}>{SUPPORT_STATUS[t.status].label}</Badge></span>
                            {formatDateTime(t.lastMessageAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <SupportThread
              key={current || 'new'}
              ticketId={current || null}
              viewerUid={uid}
              page={pathname}
              onCreated={id => { refresh().finally(() => setCurrent(id)) }}
              onSent={refresh}
            />
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'ปิดแชทแจ้งปัญหา' : 'แจ้งปัญหาถึงผู้ดูแลระบบ'}
        title="แจ้งปัญหาถึงผู้ดูแลระบบ"
        aria-expanded={open}
        className="fixed bottom-6 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-clay-600 text-white shadow-[0_8px_24px_-4px_rgba(43,103,119,0.55)] transition-transform hover:scale-105 hover:bg-clay-700 focus:outline-none focus:ring-4 focus:ring-clay-600/30 sm:right-6"
      >
        {open ? <X size={24} /> : <MessageCircleQuestion size={26} />}
        {!open && unread > 0 && (
          <span aria-label={`มีคำตอบใหม่ ${unread} เรื่อง`}
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brick-600 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  )
}
