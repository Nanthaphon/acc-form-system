import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Submission } from '../types/schema'
import { subStatus, statusMeta, statusLabel } from '../data/submissions'

// Status pill for a submission. While waiting for signatures, hovering it shows
// a styled tooltip listing who still hasn't signed (block role + assigned name).
// The tooltip is rendered in a portal at a fixed position so it is never clipped
// by a table's overflow container.
export default function StatusBadge({ sub }: { sub: Submission }) {
  const st = subStatus(sub)
  const meta = statusMeta(st)
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const pending = (sub.signatures ?? []).filter(x => x.status !== 'signed')
  const hasTip = st === 'pending' && pending.length > 0

  function show() {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left + r.width / 2, y: r.top })
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
          style={{ position: 'fixed', left: pos.x, top: pos.y - 8, transform: 'translate(-50%,-100%)' }}
          className="pointer-events-none z-[200] w-max max-w-xs rounded-lg bg-gray-900 px-3 py-2 text-left text-xs text-white shadow-xl"
        >
          <div className="mb-1 font-semibold text-gray-100">ยังไม่ได้เซ็น</div>
          <ul className="space-y-0.5">
            {pending.map((x, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-amber-300">•</span>
                <span><span className="text-gray-300">{x.blockLabel}</span>{x.assignedName ? ` — ${x.assignedName}` : ''}</span>
              </li>
            ))}
          </ul>
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>,
        document.body,
      )}
    </span>
  )
}
