import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

// The app's single theme. Every page builds from these tokens and components so
// cards, buttons, fields and tables look the same everywhere. Palette: Tailwind
// gray for surfaces/text, blue-600 for primary actions; the sidebar keeps its navy.
export const ui = {
  // surfaces
  card: 'rounded-xl border border-gray-200 bg-white p-6',
  cardTitle: 'text-[15px] font-semibold text-gray-900',
  hint: 'text-xs text-gray-500',
  // form fields
  label: 'mb-1.5 block text-xs font-medium text-gray-500',
  input: 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500',
  inputSm: 'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100',
  // buttons
  btnPrimary: 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60',
  btnSecondary: 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900 disabled:opacity-60',
  btnDashed: 'inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40',
  btnGhost: 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800',
  // tables
  tableWrap: 'overflow-x-auto rounded-xl border border-gray-200 bg-white',
  table: 'w-full text-sm',
  thead: 'bg-gray-50 text-gray-600',
  th: 'whitespace-nowrap px-4 py-3 text-left font-medium',
  tbody: 'divide-y divide-gray-100',
  tr: 'hover:bg-gray-50',
  td: 'px-4 py-2.5 text-gray-700',
  emptyCell: 'px-4 py-10 text-center text-sm text-gray-400',
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
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
      )}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{icon}</div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const BADGE_TONES = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
} as const

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>{children}</span>
}
