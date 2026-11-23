import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

// What an empty table says: an icon and one line, centred — the same on every
// list, rather than a faint line of grey text.
export default function EmptyRow({ colSpan, children, icon }: { colSpan: number; children: ReactNode; icon?: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-clay-50 text-clay-400">
            {icon ?? <Inbox size={20} />}
          </span>
          <span className="text-sm text-stone-500">{children}</span>
        </div>
      </td>
    </tr>
  )
}
