import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from 'lucide-react'
import { PageHeader, ui } from '../components/ui'
import { MANUAL_PARTS, MANUAL_PDF, MANUAL_SLIDES, clampSlide, manualSlideSrc } from '../shared/manual'

const TOTAL = MANUAL_SLIDES.length
const arrowBtn = 'absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-700 shadow-[0_4px_14px_rgba(0,0,0,0.18)] ring-1 ring-stone-200 transition hover:bg-white hover:text-clay-700 disabled:pointer-events-none disabled:opacity-0'

// The employee manual, read inside the app: one slide at a time, with the
// contents beside it. The page number lives in the address (?p=5), so a link
// can point a colleague at the exact step.
export default function ManualPage() {
  const [params, setParams] = useSearchParams()
  const page = clampSlide(params.get('p'))
  const stageRef = useRef<HTMLDivElement>(null)
  const tocRef = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)

  const go = (n: number) => {
    const next = Math.min(Math.max(n, 1), TOTAL)
    if (next !== page) setParams({ p: String(next) }, { replace: true })
  }

  // Arrow keys page through, as in any slide viewer — but never while typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(page + 1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(page - 1) }
      else if (e.key === 'Home') { e.preventDefault(); go(1) }
      else if (e.key === 'End') { e.preventDefault(); go(TOTAL) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Keep the current entry of the contents in view as the slides advance.
  useEffect(() => {
    tocRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [page])

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else stageRef.current?.requestFullscreen?.().catch(() => { /* not allowed here: stay in the page */ })
  }

  const title = MANUAL_SLIDES[page - 1].title
  let n = 0

  return (
    <div>
      <PageHeader
        icon={<BookOpen size={20} />}
        title="คู่มือการใช้งาน"
        subtitle={`สำหรับพนักงาน · ${TOTAL} หน้า`}
        actions={<>
          <a href={MANUAL_PDF} download="คู่มือ Acc Documents สำหรับพนักงาน.pdf" className={ui.btnSecondary}>
            <Download size={16} /> ดาวน์โหลด PDF
          </a>
          <button type="button" onClick={toggleFull} className={ui.btnSecondary}>
            <Maximize2 size={16} /> เต็มจอ
          </button>
        </>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <div
            ref={stageRef}
            className={`relative overflow-hidden ${full ? 'flex items-center justify-center bg-stone-900' : 'aspect-video rounded-2xl border border-stone-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(22,32,36,0.20)]'}`}
          >
            <img
              key={page}
              src={manualSlideSrc(page)}
              alt={`หน้า ${page}: ${title}`}
              className="h-full w-full object-contain"
            />
            <button type="button" onClick={() => go(page - 1)} disabled={page === 1} aria-label="หน้าก่อนหน้า" className={`${arrowBtn} left-2`}>
              <ChevronLeft size={22} />
            </button>
            <button type="button" onClick={() => go(page + 1)} disabled={page === TOTAL} aria-label="หน้าถัดไป" className={`${arrowBtn} right-2`}>
              <ChevronRight size={22} />
            </button>
            {full && (
              <button type="button" onClick={toggleFull} aria-label="ออกจากเต็มจอ" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-700 hover:bg-white">
                <Minimize2 size={18} />
              </button>
            )}
          </div>
          {/* the neighbours load ahead, so paging feels instant */}
          {page > 1 && <img src={manualSlideSrc(page - 1)} alt="" className="hidden" />}
          {page < TOTAL && <img src={manualSlideSrc(page + 1)} alt="" className="hidden" />}

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => go(page - 1)} disabled={page === 1} className={ui.btnSecondary}>
              <ChevronLeft size={16} /> ก่อนหน้า
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="truncate text-sm font-medium text-stone-900">{title}</div>
              <div className="text-xs text-stone-500">หน้า {page} / {TOTAL} · ใช้ปุ่มลูกศรบนคีย์บอร์ดเปลี่ยนหน้าได้</div>
            </div>
            <button type="button" onClick={() => go(page + 1)} disabled={page === TOTAL} className={ui.btnSecondary}>
              ถัดไป <ChevronRight size={16} />
            </button>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-stone-200" aria-hidden>
            <div className="h-full rounded-full bg-clay-600 transition-[width]" style={{ width: `${(page / TOTAL) * 100}%` }} />
          </div>
        </div>

        <nav ref={tocRef} aria-label="สารบัญคู่มือ" className="max-h-[70vh] overflow-auto rounded-2xl border border-stone-200 bg-white p-3 xl:max-h-[calc(100vh-9rem)]">
          {MANUAL_PARTS.map(part => (
            <div key={part.title} className="mb-2 last:mb-0">
              <div className="px-2 pb-1 pt-2 text-xs font-semibold text-stone-500">{part.title}</div>
              {part.slides.map(s => {
                const k = ++n
                const on = k === page
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => go(k)}
                    aria-current={on ? 'page' : undefined}
                    className={`flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${on ? 'bg-clay-50 font-medium text-clay-700' : 'text-stone-700 hover:bg-stone-50'}`}
                  >
                    <span className={`w-5 shrink-0 text-right tabular-nums ${on ? 'text-clay-600' : 'text-stone-400'}`}>{k}</span>
                    <span className="min-w-0">{s.title}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
