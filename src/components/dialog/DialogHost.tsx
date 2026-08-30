import { useEffect, useSyncExternalStore } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { subscribe, getCurrent, resolveCurrent } from './dialogService'
import type { DialogTone } from './dialogService'

const TONE: Record<DialogTone, { icon: typeof Info; iconWrap: string; confirmBtn: string }> = {
  default: { icon: Info,           iconWrap: 'bg-blue-50 text-blue-600',   confirmBtn: 'bg-[#2b5bd7] hover:bg-[#2450c4]' },
  danger:  { icon: AlertTriangle,  iconWrap: 'bg-red-50 text-red-600',     confirmBtn: 'bg-[#d64545] hover:bg-[#c23a3a]' },
  success: { icon: CheckCircle2,   iconWrap: 'bg-green-50 text-green-600', confirmBtn: 'bg-[#1f9d57] hover:bg-[#188a4c]' },
}

// Single modal host — mounted once at the app root. Renders the active dialog
// request from the dialog service, styled to match the app.
export default function DialogHost() {
  const current = useSyncExternalStore(subscribe, getCurrent)

  useEffect(() => {
    if (!current) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') resolveCurrent(false)
      else if (e.key === 'Enter') resolveCurrent(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current])

  if (!current) return null
  const isConfirm = current.kind === 'confirm'
  const tone = TONE[current.tone ?? 'default']
  const Icon = tone.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => resolveCurrent(false)} />
      <div
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
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {isConfirm && (
            <button
              onClick={() => resolveCurrent(false)}
              className="rounded-[10px] border border-[#e5eaf3] bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {current.cancelText ?? 'ยกเลิก'}
            </button>
          )}
          <button
            autoFocus
            onClick={() => resolveCurrent(true)}
            className={`rounded-[10px] px-4 py-2 text-sm font-semibold text-white ${tone.confirmBtn}`}
          >
            {current.confirmText ?? (isConfirm ? 'ยืนยัน' : 'ตกลง')}
          </button>
        </div>
      </div>
      <style>{`@keyframes dlgpop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
