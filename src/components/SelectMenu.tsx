import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface SelectOption { value: string; label: string; disabled?: boolean }

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  ariaLabel: string
  /** Classes for the box itself, so it matches the fields around it. */
  className?: string
  style?: CSSProperties
  title?: string
  disabled?: boolean
  /** A search box at the top; on by default past 8 options. */
  searchable?: boolean
}

const MENU_MIN = 176   // px — the list is never narrower than this, however thin the box
const MENU_MAX = 320
const ROOM = 280       // below this much room under the box, the list opens upward

// A drop-down for the claim form, drawn by the app instead of the browser: the
// list is as wide as its words need even when the box is a thin table cell
// (the browser's own cut "— เลือก —" down to "— เ"), it floats over the
// table instead of being clipped by it, the picked one is ticked, and a long
// list (banks) can be searched. Arrow keys, Enter and Esc work as on a select.
export default function SelectMenu({ value, onChange, options, ariaLabel, className = '', style, title, disabled, searchable }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const listId = useId()
  const withSearch = searchable ?? options.length > 8

  const needle = q.trim().toLowerCase()
  const shown = useMemo(
    () => (needle ? options.filter(o => o.value && o.label.toLowerCase().includes(needle)) : options),
    [options, needle],
  )
  const picked = options.find(o => o.value === value)

  function place() {
    const r = button.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(Math.max(r.width, MENU_MIN), MENU_MAX)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    setPos(window.innerHeight - r.bottom < ROOM && r.top > ROOM
      ? { left, width, bottom: window.innerHeight - r.top + 4 }
      : { left, width, top: r.bottom + 4 })
  }
  function openList() {
    if (disabled) return
    setQ('')
    setActive(Math.max(0, options.findIndex(o => o.value === value)))
    place()
    setOpen(true)
  }
  function close(focus = true) {
    setOpen(false)
    if (focus) button.current?.focus()
  }
  function choose(o: SelectOption) {
    if (o.disabled) return
    if (o.value !== value) onChange(o.value)
    close()
  }

  useLayoutEffect(() => { if (open && withSearch) search.current?.focus() }, [open, withSearch])
  useEffect(() => {
    if (!open) return
    const outside = (e: Event) => {
      const t = e.target as Node
      if (menu.current?.contains(t) || button.current?.contains(t)) return
      setOpen(false)
    }
    // The page or the table scrolling under an open list: it would float away from its box.
    const scrolled = (e: Event) => { if (!menu.current?.contains(e.target as Node)) setOpen(false) }
    const resized = () => setOpen(false)
    document.addEventListener('mousedown', outside)
    window.addEventListener('scroll', scrolled, true)
    window.addEventListener('resize', resized)
    return () => {
      document.removeEventListener('mousedown', outside)
      window.removeEventListener('scroll', scrolled, true)
      window.removeEventListener('resize', resized)
    }
  }, [open])
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open])

  function step(from: number, dir: 1 | -1) {
    for (let i = from + dir; i >= 0 && i < shown.length; i += dir) if (!shown[i].disabled) return i
    return from
  }
  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => step(i, 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => step(i, -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) choose(shown[active]) }
    else if (e.key === 'Tab') close(false)
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        data-value={value}
        title={title ?? picked?.label}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKey}
        style={style}
        className={`inline-flex items-center gap-1 text-left ${className} ${open ? 'border-clay-500 ring-2 ring-clay-100' : ''}`}
      >
        <span className={`min-w-0 flex-1 truncate ${value ? '' : 'text-stone-400'}`}>{picked?.label ?? value}</span>
        <ChevronDown aria-hidden size={14} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && createPortal(
        <div
          ref={menu}
          onKeyDown={onKey}
          style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width }}
          className="z-[160] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_12px_32px_-8px_rgba(22,32,36,0.25)]"
        >
          {withSearch && (
            <div className="border-b border-stone-100 p-2">
              <div className="relative">
                <Search aria-hidden size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  ref={search}
                  value={q}
                  onChange={e => { setQ(e.target.value); setActive(0) }}
                  placeholder="พิมพ์เพื่อค้นหา"
                  aria-label={`ค้นหา ${ariaLabel}`}
                  className="w-full rounded-md border border-stone-200 py-1.5 pl-8 pr-2 text-sm placeholder:text-stone-400 focus:border-clay-600 focus:outline-none"
                />
              </div>
            </div>
          )}
          <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel} className="scroll-slim max-h-72 overflow-y-auto p-1">
            {shown.length === 0 && <li className="px-3 py-5 text-center text-sm text-stone-500">ไม่พบรายการ</li>}
            {shown.map((o, i) => {
              const isPicked = o.value === value
              return (
                <li
                  key={o.value || '__none'}
                  role="option"
                  aria-selected={isPicked}
                  aria-disabled={o.disabled || undefined}
                  data-index={i}
                  data-value={o.value}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${
                    o.disabled ? 'cursor-default text-stone-300' : 'cursor-pointer'
                  } ${i === active && !o.disabled ? 'bg-stone-100' : ''} ${
                    isPicked ? 'font-medium text-stone-900' : o.value ? 'text-stone-700' : 'text-stone-500'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {isPicked && <Check aria-hidden size={15} className="shrink-0 text-clay-600" />}
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )}
    </>
  )
}
