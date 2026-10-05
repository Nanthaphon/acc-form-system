import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Flag, Info, Maximize2, Minimize2 } from 'lucide-react'
import { PageHeader, ui } from '../components/ui'
import { useAuth } from '../auth/AuthProvider'
import { ADMIN_MANUAL, EMPLOYEE_MANUAL, clampSlide, manualSlideSrc, manualSlides, partRanges } from '../shared/manual'
import type { Manual } from '../shared/manual'

const arrowBtn = 'absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-700 shadow-[0_4px_14px_rgba(0,0,0,0.18)] ring-1 ring-stone-200 transition hover:bg-white hover:text-clay-700 disabled:pointer-events-none disabled:opacity-0'

// The user manual, read inside the app: one slide at a time, with the
// contents beside it. Admins get their own manual and can switch to the
// employees' one. The manual and page live in the address (?m=admin&p=5),
// so a link can point a colleague at the exact step.
export default function ManualPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [params, setParams] = useSearchParams()
  const manual = isAdmin && params.get('m') !== 'employee' ? ADMIN_MANUAL : EMPLOYEE_MANUAL
  const slides = manualSlides(manual)
  const total = slides.length
  const page = clampSlide(params.get('p'), total)
  const stageRef = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)

  const go = (n: number) => {
    const next = Math.min(Math.max(n, 1), total)
    if (next === page) return
    setParams(prev => { const q = new URLSearchParams(prev); q.set('p', String(next)); return q }, { replace: true })
  }
  const pick = (m: Manual) => { if (m !== manual) setParams({ m: m.key }, { replace: true }) }

  // Arrow keys page through, as in any slide viewer — but never while typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(page + 1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(page - 1) }
      else if (e.key === 'Home') { e.preventDefault(); go(1) }
      else if (e.key === 'End') { e.preventDefault(); go(total) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else stageRef.current?.requestFullscreen?.().catch(() => { /* not allowed here: stay in the page */ })
  }

  const title = slides[page - 1].title

  return (
    <div>
      <PageHeader
        icon={<BookOpen size={20} />}
        title="คู่มือการใช้งาน"
        subtitle={`${manual.audience} · ${total} หน้า`}
        actions={<>
          <a href={manual.pdf} download={manual.pdfName} className={ui.btnSecondary}>
            <Download size={16} /> ดาวน์โหลด PDF
          </a>
          <button type="button" onClick={toggleFull} className={ui.btnSecondary}>
            <Maximize2 size={16} /> เต็มจอ
          </button>
        </>}
      />

      {isAdmin && (
        <div role="tablist" aria-label="เลือกคู่มือ" className="mb-4 inline-flex rounded-xl border border-stone-200 bg-white p-1">
          {[ADMIN_MANUAL, EMPLOYEE_MANUAL].map(m => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={m === manual}
              onClick={() => pick(m)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${m === manual ? 'bg-clay-600 text-white' : 'text-stone-600 hover:bg-stone-50'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3">
          <div
            ref={stageRef}
            className={`relative overflow-hidden ${full ? 'flex items-center justify-center bg-stone-900' : 'aspect-video rounded-2xl border border-stone-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(22,32,36,0.20)]'}`}
          >
            <img
              key={`${manual.key}-${page}`}
              src={manualSlideSrc(manual, page)}
              alt={`หน้า ${page}: ${title}`}
              className="h-full w-full object-contain"
            />
            <button type="button" onClick={() => go(page - 1)} disabled={page === 1} aria-label="หน้าก่อนหน้า" className={`${arrowBtn} left-2`}>
              <ChevronLeft size={22} />
            </button>
            <button type="button" onClick={() => go(page + 1)} disabled={page === total} aria-label="หน้าถัดไป" className={`${arrowBtn} right-2`}>
              <ChevronRight size={22} />
            </button>
            {full && (
              <button type="button" onClick={toggleFull} aria-label="ออกจากเต็มจอ" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-700 hover:bg-white">
                <Minimize2 size={18} />
              </button>
            )}
          </div>
          {/* the neighbours load ahead, so paging feels instant */}
          {page > 1 && <img src={manualSlideSrc(manual, page - 1)} alt="" className="hidden" />}
          {page < total && <img src={manualSlideSrc(manual, page + 1)} alt="" className="hidden" />}

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => go(page - 1)} disabled={page === 1} className={ui.btnSecondary}>
              <ChevronLeft size={16} /> ก่อนหน้า
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="truncate text-sm font-medium text-stone-900">{title}</div>
              <div className="text-xs text-stone-500">หน้า {page} / {total} · ใช้ปุ่มลูกศรบนคีย์บอร์ดเปลี่ยนหน้าได้</div>
            </div>
            <button type="button" onClick={() => go(page + 1)} disabled={page === total} className={ui.btnSecondary}>
              ถัดไป <ChevronRight size={16} />
            </button>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-stone-200" aria-hidden>
            <div className="h-full rounded-full bg-clay-600 transition-[width]" style={{ width: `${(page / total) * 100}%` }} />
          </div>
        </div>

        <Contents key={manual.key} manual={manual} page={page} onGo={go} />
      </div>
    </div>
  )
}

// The contents, as a path through the manual: each part is a step with its
// number, how many topics it holds and whether it has been read; the part
// being read opens to its topics, the others fold away (any can be opened).
// Read topics fill in, the current one is marked, the rest wait as rings.
function Contents({ manual, page, onGo }: { manual: Manual; page: number; onGo: (n: number) => void }) {
  const parts = partRanges(manual)
  const total = parts[parts.length - 1].last
  const activeIdx = parts.findIndex(p => page >= p.first && page <= p.last)
  const [open, setOpen] = useState<Set<number>>(() => new Set([activeIdx]))
  const listRef = useRef<HTMLOListElement>(null)

  // Reaching a new part opens it.
  useEffect(() => {
    setOpen(o => (o.has(activeIdx) ? o : new Set(o).add(activeIdx)))
  }, [activeIdx])
  // Keep the current topic in view as the slides advance.
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [page, open])

  const toggle = (i: number) => setOpen(o => { const n = new Set(o); if (n.has(i)) n.delete(i); else n.add(i); return n })

  return (
    <nav aria-label="สารบัญคู่มือ" className="flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white xl:max-h-[calc(100vh-9rem)]">
      <div className="border-b border-stone-100 px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-stone-900">สารบัญ</span>
          <span className="text-xs tabular-nums text-stone-500">อ่านแล้ว {page} / {total} หน้า</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-100" aria-hidden>
          <div className="h-full rounded-full bg-clay-500 transition-[width]" style={{ width: `${(page / total) * 100}%` }} />
        </div>
      </div>

      <ol ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
        {parts.map((p, i) => {
          const active = i === activeIdx
          const done = page > p.last
          const isOpen = open.has(i)
          const topics = p.slides.map((s, k) => ({ ...s, n: p.first + k })).filter(s => !s.divider)
          const badge = done ? <Check size={14} strokeWidth={3} />
            : p.num ?? (i === 0 ? <Info size={14} /> : <Flag size={14} />)
          return (
            <li key={p.title}>
              <div className={`flex items-center rounded-xl ${active ? 'bg-clay-50' : 'hover:bg-stone-50'}`}>
                <button type="button" onClick={() => onGo(p.first)} className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2 text-left">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-clay-600 text-white' : done ? 'bg-clay-100 text-clay-700' : 'bg-stone-100 text-stone-500'}`}>
                    {badge}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold leading-snug ${active ? 'text-clay-700' : 'text-stone-900'}`}>{p.title}</span>
                    <span className="block text-xs text-stone-500">{topics.length} หัวข้อ{done ? ' · อ่านแล้ว' : ''}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'ย่อ' : 'ขยาย'}หัวข้อ ${p.title}`}
                  className="mr-1.5 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700"
                >
                  <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isOpen && (
                <ol className="mb-2 ml-[1.45rem] mt-1 border-l-2 border-stone-100 pl-4">
                  {topics.map(t => {
                    const on = t.n === page
                    const seen = t.n < page
                    return (
                      <li key={t.n} className="relative">
                        <span
                          aria-hidden
                          className={`absolute -left-[1.375rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${on ? 'bg-clay-600 ring-4 ring-clay-100' : seen ? 'bg-clay-300' : 'border-2 border-stone-300 bg-white'}`}
                        />
                        <button
                          type="button"
                          onClick={() => onGo(t.n)}
                          aria-current={on ? 'page' : undefined}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm leading-snug transition-colors ${on ? 'bg-clay-600 font-medium text-white' : seen ? 'text-stone-500 hover:bg-stone-50' : 'text-stone-700 hover:bg-stone-50'}`}
                        >
                          {t.title}
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
