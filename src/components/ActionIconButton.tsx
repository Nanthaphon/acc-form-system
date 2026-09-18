import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Tone is accepted at every call site for readability. An ICON-ONLY button
// ignores it: a row of bare icons reads as a single neutral set (see
// ActionIconButton.test.tsx). A LABELLED button carries its own wording, so the
// only colour worth spending there is the warning on a destructive action.
type Tone = 'blue' | 'green' | 'indigo' | 'amber' | 'red'

interface BaseProps {
  label: string        // full wording — tooltip and screen readers
  short?: string       // shorter wording for the visible label (defaults to label)
  icon: ReactNode
  tone?: Tone
  showLabel?: boolean  // write the wording beside the icon, for rows of several actions
}

type Props = BaseProps & { to?: string; onClick?: (e: MouseEvent<HTMLButtonElement>) => void }

const iconOnlyClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-white align-middle text-gray-900 shadow-sm ring-1 ring-gray-200/80 transition hover:bg-gray-50 hover:ring-gray-300'
const labelledClass = 'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent bg-white px-2.5 align-middle text-xs font-medium shadow-sm ring-1 transition'
const labelledNeutral = 'text-gray-700 ring-gray-200/80 hover:bg-gray-50 hover:ring-gray-300'
const labelledDanger = 'text-red-600 ring-red-200 hover:bg-red-50 hover:ring-red-300'

export default function ActionIconButton({ label, short, icon, tone, showLabel, ...props }: Props) {
  const className = showLabel
    ? `${labelledClass} ${tone === 'red' ? labelledDanger : labelledNeutral}`
    : iconOnlyClass
  const content = showLabel ? <>{icon}<span>{short ?? label}</span></> : icon

  if (props.to) {
    return (
      <Link to={props.to} className={className} title={label} aria-label={label}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={props.onClick} className={className} title={label} aria-label={label}>
      {content}
    </button>
  )
}
