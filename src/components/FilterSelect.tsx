import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Check, ChevronDown, Plus, Search } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
  group?: string     // options sharing a group are listed under it as a heading
  indent?: boolean   // a sub-item (a sub-folder under its folder)
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  allLabel: string          // the "everything" choice, value '' — what an unset filter reads
  ariaLabel: string
  searchable?: boolean      // a search box at the top; on by default past 8 options
  className?: string
  /** A small chip in a table row rather than a filter box: dashed "+ …" while unset, a coloured tag once set. */
  chip?: { unsetLabel: string; icon?: ReactNode }
}

// A filter's drop-down, drawn by the app rather than the browser: grouped
// under headings, searchable when long, the picked one ticked — and the button
// itself turns teal while it filters, so what is narrowing the list shows.
export default function FilterSelect({ value, onChange, options, allLabel, ariaLabel, searchable, className = '', chip }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()
  const withSearch = searchable ?? options.length > 8

  const needle = q.trim().toLowerCase()
  const shown = useMemo(() => {
    const all: FilterOption[] = [{ value: '', label: allLabel }, ...options]
    return needle ? all.filter(o => o.value && `${o.label} ${o.group ?? ''}`.toLowerCase().includes(needle)) : all
  }, [options, allLabel, needle])
  const picked = options.find(o => o.value === value)

  function openList() {
    setQ('')
    setActive(Math.max(0, [{ value: '' }, ...options].findIndex(o => o.value === value)))
    setOpen(true)
  }
  function choose(v: string) {
    onChange(v)
    setOpen(false)
    button.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    if (withSearch) search.current?.focus()
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, withSearch])

  // The highlighted option kept in view while moving through a long list.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" })
  }, [active, open])

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); button.current?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(shown.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) choose(shown[active].value) }
    else if (e.key === 'Tab') setOpen(false)
  }

  const filtering = value !== ''
  let lastGroup: string | undefined

  return (
    <div ref={box} className={`relative ${className}`} onKeyDown={onKey}>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        className={chip
          ? `inline-flex max-w-[11rem] items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-medium leading-5 transition-colors focus:outline-none focus:ring-2 focus:ring-clay-600/20 ${
              filtering
                ? 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                : 'border-transparent bg-transparent text-stone-400 hover:bg-stone-100 hover:text-stone-700'
            }`
          : `flex w-full items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-clay-600/15 ${
              filtering
                ? 'border-stone-300 bg-white font-medium text-stone-900 hover:border-stone-400'
                : 'border-stone-200/60 bg-white text-stone-700 hover:border-stone-300'
            } ${open ? 'border-clay-600 ring-2 ring-clay-600/15' : ''}`}
      >
        {chip ? (
          filtering
            ? <>{chip.icon}<span className="min-w-0 truncate">{picked?.label ?? value}</span><ChevronDown size={13} className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} /></>
            : <><Plus size={13} className="shrink-0" /><span className="truncate">{chip.unsetLabel}</span></>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">{picked?.label ?? allLabel}</span>
            <ChevronDown size={15} className={`shrink-0 transition-transform ${filtering ? 'text-stone-600' : 'text-stone-400'} ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-max min-w-full max-w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_12px_32px_-8px_rgba(22,32,36,0.25)]">
          {withSearch && (
            <div className="border-b border-stone-100 p-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  ref={search}
                  value={q}
                  onChange={e => { setQ(e.target.value); setActive(0) }}
                  placeholder="พิมพ์เพื่อค้นหา"
                  aria-label={`ค้นหา${ariaLabel}`}
                  className="w-full rounded-md border border-stone-200 py-1.5 pl-8 pr-2 text-sm placeholder:text-stone-400 focus:border-clay-600 focus:outline-none"
                />
              </div>
            </div>
          )}
          <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel} className="scroll-slim max-h-80 overflow-y-auto p-1">
            {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-stone-500">ไม่พบรายการ</li>}
            {shown.map((o, i) => {
              const heading = o.group && o.group !== lastGroup ? o.group : null
              lastGroup = o.group
              const isPicked = o.value === value
              return (
                <li key={o.value || '__all'} role="presentation">
                  {heading && (
                    <div className={`truncate px-2.5 pb-1 pt-2 text-[11px] font-semibold text-stone-500 ${i > 0 ? "mt-1" : ""}`} aria-hidden>{heading}</div>
                  )}
                  <div
                    role="option"
                    aria-selected={isPicked}
                    data-index={i}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => choose(o.value)}
                    className={`flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2.5 text-sm ${o.indent ? 'pl-6' : 'pl-2.5'} ${
                      i === active ? 'bg-stone-100' : ''
                    } ${isPicked ? 'font-medium text-clay-700' : o.value ? 'text-stone-700' : 'text-stone-500'}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {isPicked && <Check size={15} className="shrink-0 text-clay-600" />}
                  </div>
                  {!o.value && !needle && shown.length > 1 && <div className="mx-1 my-1 border-t border-stone-100" aria-hidden />}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
