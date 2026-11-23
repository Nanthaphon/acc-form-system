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
