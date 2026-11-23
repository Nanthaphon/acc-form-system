// Placeholder rows shaped like a table's own, shown while its list loads — so
// a page switch shows the page at once instead of an empty screen.
const WIDTHS = ['w-40', 'w-28', 'w-20', 'w-24', 'w-32', 'w-16']

export default function TableSkeleton({ rows = 6, cols, leading = false }: { rows?: number; cols: number; leading?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="animate-pulse" aria-hidden>
          {leading && <td className="w-10 px-4 py-3.5"><div className="h-4 w-4 rounded bg-stone-100" /></td>}
          {Array.from({ length: cols }, (_, j) => (
            <td key={j} className="px-4 py-3.5"><div className={`h-3 rounded bg-stone-100 ${WIDTHS[(i + j) % WIDTHS.length]}`} /></td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** Placeholder lines for a list that is not a table. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-3 px-4 py-3.5" aria-hidden>
          <div className="h-8 w-8 shrink-0 rounded-full bg-stone-100" />
          <div className="flex-1 space-y-2">
            <div className={`h-3 rounded bg-stone-100 ${WIDTHS[i % WIDTHS.length]}`} />
            <div className="h-2.5 w-24 rounded bg-stone-100" />
          </div>
        </li>
      ))}
    </>
  )
}

/** A whole page still loading: a title, a card and a table's worth of grey. */
export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="กำลังโหลด">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-stone-200" />
        <div className="h-5 w-56 rounded bg-stone-200" />
      </div>
      <div className="grid gap-5 rounded-2xl border border-stone-200/60 bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-2"><div className="h-2.5 w-16 rounded bg-stone-100" /><div className="h-3.5 w-32 rounded bg-stone-100" /></div>
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-stone-200/60 bg-white" />
    </div>
  )
}
