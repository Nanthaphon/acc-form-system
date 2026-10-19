import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'

// The actions at the end of a table row, in three weights:
//   ActionGroup   — the everyday ones (open, print, copy) joined into one control
//   PrimaryAction — the step the row is waiting for, filled so it stands out
//   RowMenu (⋯)   — the rare and the destructive, out of the way until asked for
// A row of five equal buttons said nothing about which one mattered.

const itemClass = 'inline-flex h-8 min-w-[4.5rem] items-center justify-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus-visible:bg-clay-50'

export function ActionGroup({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex divide-x divide-stone-200 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-stone-200/80">
      {children}
    </div>
  )
}

export function ActionGroupItem({ label, short, icon, to, onClick }: {
  label: string; short: string; icon: ReactNode; to?: string; onClick?: () => void
}) {
  const content = <>{icon}<span>{short}</span></>
  return to
    ? <Link to={to} className={itemClass} title={label} aria-label={label}>{content}</Link>
    : <button type="button" onClick={onClick} className={itemClass} title={label} aria-label={label}>{content}</button>
}

// Fixed width, so the groups beside it line up down the table whether or not
// a row has one (see PrimarySlot).
const PRIMARY_W = 'w-[7.5rem]'

export function PrimaryAction({ label, short, icon, onClick }: { label: string; short: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${PRIMARY_W} inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-clay-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-clay-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-600/40`}
    >
      {icon}{short}
    </button>
  )
}

// The space a primary action takes, for rows that have none.
export function PrimarySlot() {
  return <span aria-hidden className={`${PRIMARY_W} inline-block`} />
}

export interface RowMenuItem { label: string; icon: ReactNode; onClick: () => void; danger?: boolean }

const MENU_W = 200

// The ⋯ menu. Drawn on the page itself rather than inside the table, whose
// sideways scrolling would cut it off on the last rows; it opens upward when
// there is no room below.
export function RowMenu({ items, label = 'ตัวเลือกเพิ่มเติม' }: { items: RowMenuItem[]; label?: string }) {
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const open = pos !== null

  function toggle() {
    if (open) { setPos(null); return }
    const r = button.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8))
    const roomBelow = window.innerHeight - r.bottom
    setPos(roomBelow < 48 * items.length + 24
      ? { left, bottom: window.innerHeight - r.top + 6 }
      : { left, top: r.bottom + 6 })
  }

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      const t = e.target as Node
      if (menu.current?.contains(t) || button.current?.contains(t)) return
      setPos(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPos(null); button.current?.focus() } }
    const drop = () => setPos(null)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', drop, true)
    window.addEventListener('resize', drop)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', drop, true)
      window.removeEventListener('resize', drop)
    }
  }, [open])

  useEffect(() => { if (open) menu.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus() }, [open])

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 ring-1 transition-colors hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-600/40 ${
          open ? 'bg-stone-50 text-stone-900 ring-stone-300' : 'bg-white ring-stone-200/80 shadow-sm'
        }`}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && createPortal(
        <div
          ref={menu}
          role="menu"
          aria-label={label}
          style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: MENU_W }}
          className="z-[150] overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
        >
          {items.map((it, i) => (
            <div key={it.label}>
              {/* A line above the first destructive item keeps it apart from the rest. */}
              {it.danger && i > 0 && !items[i - 1].danger && <div className="my-1 border-t border-stone-100" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => { setPos(null); it.onClick() }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none ${
                  it.danger ? 'text-brick-600 hover:bg-rose-50 focus-visible:bg-rose-50' : 'text-stone-700 hover:bg-stone-50 focus-visible:bg-stone-50'
                }`}
              >
                {it.icon}{it.label}
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

// The space the ⋯ button takes, for rows with nothing in it.
export function RowMenuSlot() {
  return <span aria-hidden className="inline-block w-8" />
}
