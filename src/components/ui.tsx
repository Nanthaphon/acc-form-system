import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

// The app's single theme. Every page builds from these tokens and components so
// cards, buttons, fields and tables look the same everywhere.
//
// Palette: the Harbor set defined in tailwind.config.js — clay (teal) for
// anything the user acts on, stone for surfaces and text, olive/ochre/brick
// where a colour has to carry meaning. Those names deliberately do not
// describe the colours, so the whole app can be re-toned by editing the
// palette in one place, without touching a class name anywhere else.
export const ui = {
  // surfaces
  card: 'rounded-2xl border border-stone-200/60 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(22,32,36,0.20)]',
  cardTitle: 'text-[15px] font-semibold text-stone-900',
  hint: 'text-xs text-stone-500',
  // form fields
  label: 'mb-1.5 block text-xs font-medium text-stone-500',
  input: 'w-full rounded-xl border border-stone-200/60 bg-white px-3.5 py-2.5 text-sm text-stone-800 transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-clay-600 focus:outline-none focus:ring-2 focus:ring-clay-600/15 disabled:bg-stone-50 disabled:text-stone-400',
  inputSm: 'rounded-xl border border-stone-200/60 bg-white px-3 py-1.5 text-sm text-stone-800 transition-all placeholder:text-stone-400 hover:border-stone-300 focus:border-clay-600 focus:outline-none focus:ring-2 focus:ring-clay-600/15',
  // buttons
  btnPrimary: 'inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-clay-700 focus:outline-none focus:ring-2 focus:ring-clay-600/30 disabled:bg-stone-300',
  btnSecondary: 'inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60',
  btnDashed: 'inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-clay-600 hover:text-clay-700 disabled:opacity-40',
  btnGhost: 'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900',
  // tables
  tableWrap: 'overflow-x-auto rounded-2xl border border-stone-200/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(22,32,36,0.20)]',
  table: 'w-full text-sm',
  thead: 'border-b border-stone-200/60 text-stone-500',
  th: 'whitespace-nowrap px-4 py-3 text-left text-xs font-medium',
  tbody: 'divide-y divide-stone-100',
  tr: 'transition-colors hover:bg-stone-50/60',
  td: 'px-4 py-2.5 text-stone-700',
  emptyCell: 'px-4 py-10 text-center text-sm text-stone-400',
} as const

// Page title row: optional back button, icon tile, title + subtitle, actions on the right.
export function PageHeader({ icon, title, subtitle, onBack, actions }: {
  icon: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  onBack?: () => void
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
      )}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600">{icon}</div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-stone-900">{title}</h1>
        {subtitle && <p className="truncate text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// A tone name says what a badge MEANS, not what colour it is: `blue` is the
// brand teal, `green` the sea green, `red` the brick.
const BADGE_TONES = {
  gray: 'bg-stone-100 text-stone-600',
  blue: 'bg-clay-50 text-clay-700',
  green: 'bg-olive-50 text-olive-700',
  amber: 'bg-ochre-50 text-ochre-700',
  red: 'bg-rose-50 text-brick-600',
} as const

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${BADGE_TONES[tone]}`}>{children}</span>
}
