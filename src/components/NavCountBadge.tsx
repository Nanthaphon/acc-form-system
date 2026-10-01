// The waiting count beside a sidebar link: a circle for a single digit, a pill
// past that. On the dark sidebar it is a filled red dot; on the active (teal)
// row it flips to white, so it stays readable without fighting the highlight.
export default function NavCountBadge({ count, active, label }: {
  count: number
  active?: boolean
  label: string
}) {
  if (count <= 0) return null
  return (
    <span
      aria-label={label}
      className={`ml-auto inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums ${
        active
          ? 'bg-white text-clay-700'
          : 'bg-gradient-to-b from-brick-500 to-brick-600 text-white shadow-[0_0_0_1px_rgba(18,48,58,0.55),0_2px_6px_rgba(176,69,60,0.45)]'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
