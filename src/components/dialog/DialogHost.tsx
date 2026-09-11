import { useEffect, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { AlertTriangle, CheckCircle2, Info, PencilLine } from 'lucide-react'
import { subscribe, getCurrent, resolveCurrent } from './dialogService'
import type { DialogTone } from './dialogService'

const TONE: Record<DialogTone, { icon: typeof Info; iconWrap: string; confirmBtn: string }> = {
  default: { icon: Info,           iconWrap: 'bg-blue-50 text-blue-600',   confirmBtn: 'bg-blue-600 hover:bg-blue-700' },
  danger:  { icon: AlertTriangle,  iconWrap: 'bg-red-50 text-red-600',     confirmBtn: 'bg-red-600 hover:bg-red-700' },
  success: { icon: CheckCircle2,   iconWrap: 'bg-green-50 text-green-600', confirmBtn: 'bg-green-600 hover:bg-green-700' },
}

// Single modal host — mounted once at the app root. Renders the active dialog
// request from the dialog service, styled to match the app.
export default function DialogHost() {
  const current = useSyncExternalStore(subscribe, getCurrent)
  const [value, setValue] = useState('')

  // Reset the input whenever a new dialog opens.
  useEffect(() => { setValue(current?.defaultValue ?? '') }, [current?.id])

  useEffect(() => {
    if (!current) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') resolveCurrent(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current])

  if (!current) return null
  const isConfirm = current.kind === 'confirm'
  const isPrompt = current.kind === 'prompt'
  const tone = TONE[current.tone ?? 'default']
  const Icon = isPrompt ? PencilLine : tone.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => resolveCurrent(false)} />
      <form
        onSubmit={e => { e.preventDefault(); resolveCurrent(true, isPrompt ? value : undefined) }}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
        style={{ animation: 'dlgpop .14s ease-out' }}
      >
        <div className="flex gap-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            {current.title && <h3 className="mb-1 text-[15px] font-semibold text-gray-900">{current.title}</h3>}
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{current.message}</p>
            {isPrompt && (
              <input
                autoFocus
                value={value}
                placeholder={current.placeholder}
                onChange={e => setValue(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {(isConfirm || isPrompt) && (
            <button
              type="button"
              onClick={() => resolveCurrent(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {current.cancelText ?? 'ยกเลิก'}
            </button>
          )}
          <button
            type="submit"
            autoFocus={!isPrompt}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${tone.confirmBtn}`}
          >
            {current.confirmText ?? (isConfirm || isPrompt ? 'ยืนยัน' : 'ตกลง')}
          </button>
        </div>
      </form>
      <style>{`@keyframes dlgpop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
