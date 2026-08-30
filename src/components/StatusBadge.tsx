import type { Submission } from '../types/schema'
import { subStatus, statusMeta, statusLabel } from '../data/submissions'

// Status pill for a submission. While waiting for signatures, hovering it shows
// who still hasn't signed (block role + assigned name) via a native tooltip.
export default function StatusBadge({ sub }: { sub: Submission }) {
  const st = subStatus(sub)
  const meta = statusMeta(st)
  const pending = (sub.signatures ?? []).filter(x => x.status !== 'signed')
  const tip = st === 'pending' && pending.length > 0
    ? 'ยังไม่ได้เซ็น:\n' + pending.map(x => `• ${x.blockLabel}${x.assignedName ? ` — ${x.assignedName}` : ''}`).join('\n')
    : undefined
  return (
    <span
      title={tip}
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}${tip ? ' cursor-help' : ''}`}
    >
      {statusLabel(sub)}
    </span>
  )
}
