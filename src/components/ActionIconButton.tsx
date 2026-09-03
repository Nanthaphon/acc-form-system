import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Tone is accepted for call-site readability but intentionally NOT applied:
// every action icon in the app renders in one neutral style so rows of actions
// read as a single consistent set (see ActionIconButton.test.tsx).
type Tone = 'blue' | 'green' | 'indigo' | 'amber' | 'red'

interface BaseProps {
  label: string
  icon: ReactNode
  tone?: Tone
}

type Props = BaseProps & { to?: string; onClick?: (e: MouseEvent<HTMLButtonElement>) => void }

const buttonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-white align-middle text-gray-900 shadow-sm ring-1 ring-gray-200/80 transition hover:bg-gray-50 hover:ring-gray-300'

export default function ActionIconButton({ label, icon, tone: _tone, ...props }: Props) {
  if (props.to) {
    return (
      <Link to={props.to} className={buttonClass} title={label} aria-label={label}>
        {icon}
      </Link>
    )
  }
  return (
    <button type="button" onClick={props.onClick} className={buttonClass} title={label} aria-label={label}>
      {icon}
    </button>
  )
}
