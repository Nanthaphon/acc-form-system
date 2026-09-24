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

const iconOnlyClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-white align-middle text-stone-900 shadow-sm ring-1 ring-stone-200/80 transition hover:bg-stone-50 hover:ring-stone-300'
const labelledClass = 'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent bg-white px-2.5 align-middle text-xs font-medium shadow-sm ring-1 transition'
const labelledNeutral = 'text-stone-700 ring-stone-200/80 hover:bg-stone-50 hover:ring-stone-300'
// The ring has to darken on hover, so the two shades must differ — Harbor has
// no rose-300 to match the old red-300, so both steps move down one instead.
const labelledDanger = 'text-brick-600 ring-rose-100 hover:bg-rose-50 hover:ring-rose-200'

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
