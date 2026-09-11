import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock3, UserRound } from 'lucide-react'
import type { Submission } from '../types/schema'
import { subStatus, statusMeta, statusLabel } from '../data/submissions'

interface TooltipPos {
  x: number
  y: number
  placement: 'top' | 'bottom'
}

function pendingCountText(count: number): string {
  return `เหลือ ${count} คน`
}

// Status pill for a document. While waiting for signatures, hovering it lists
// who still hasn't signed.
export default function StatusBadge({ sub }: { sub: Submission }) {
  const st = subStatus(sub)
  const meta = statusMeta(st)
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<TooltipPos | null>(null)

  const pending = (sub.signatures ?? []).filter(x => x.status !== 'signed')
  const hasTip = st === 'pending' && pending.length > 0

  function show() {
    const r = ref.current?.getBoundingClientRect()
    if (r) {
      const placement = r.top < 140 ? 'bottom' : 'top'
      const x = Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150)
      setPos({ x, y: placement === 'top' ? r.top - 10 : r.bottom + 10, placement })
    }
  }
  const hide = () => setPos(null)

  return (
    <span
      ref={ref}
      onMouseEnter={hasTip ? show : undefined}
      onMouseLeave={hasTip ? hide : undefined}
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}${hasTip ? ' cursor-help' : ''}`}
    >
      {statusLabel(sub)}
      {hasTip && pos && createPortal(
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            transform: pos.placement === 'top' ? 'translate(-50%,-100%)' : 'translate(-50%,0)',
          }}
          className="pointer-events-none z-[200] w-[260px] rounded-lg border border-gray-200 bg-white p-2 text-left text-xs text-gray-700 shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Clock3 size={15} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">ผู้ที่ยังไม่ได้เซ็น</div>
                <div className="text-[11px] text-gray-500">{pendingCountText(pending.length)}</div>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
              {pending.length}/{sub.signatures?.length ?? pending.length}
            </span>
          </div>
          <ul className="space-y-1">
            {pending.map((x, i) => (
              <li key={i} className="flex items-start gap-2 rounded-md bg-gray-50 px-2 py-1.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 ring-1 ring-gray-200">
                  <UserRound size={12} strokeWidth={2.2} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-gray-500">{x.blockLabel}</span>
                  <span className="block truncate font-medium text-gray-900">{x.assignedName || 'ยังไม่ได้เลือกชื่อ'}</span>
                </span>
              </li>
            ))}
          </ul>
          <span
            className={
              pos.placement === 'top'
                ? 'absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-gray-200 bg-white'
                : 'absolute bottom-full left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rotate-45 border-l border-t border-gray-200 bg-white'
            }
          />
        </div>,
        document.body,
      )}
    </span>
  )
}
