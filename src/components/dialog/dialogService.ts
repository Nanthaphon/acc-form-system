// A tiny promise-based dialog service so any code can show a styled alert/confirm
// modal without prop-threading. A single <DialogHost/> (mounted at the app root)
// subscribes and renders. Requests are queued so overlapping calls are safe.
export type DialogTone = 'default' | 'danger' | 'success'

export interface DialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: DialogTone
}

export interface DialogRequest extends DialogOptions {
  id: number
  kind: 'alert' | 'confirm'
  resolve: (ok: boolean) => void
}

let seq = 0
let current: DialogRequest | null = null
const queue: DialogRequest[] = []
const listeners = new Set<() => void>()

function emit() { listeners.forEach(l => l()) }
function pump() { if (!current && queue.length > 0) { current = queue.shift()!; emit() } }

export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function getCurrent() { return current }

export function resolveCurrent(ok: boolean) {
  if (!current) return
  const c = current
  current = null
  c.resolve(ok)
  emit()
  pump()
}

function open(kind: 'alert' | 'confirm', opts: DialogOptions): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    queue.push({ id: ++seq, kind, tone: 'default', ...opts, resolve })
    pump()
  })
}

// Styled replacement for window.alert — resolves when dismissed.
export function uiAlert(message: string, opts: Omit<DialogOptions, 'message'> = {}): Promise<boolean> {
  return open('alert', { ...opts, message })
}
// Styled replacement for window.confirm — resolves true (confirmed) / false (cancelled).
export function uiConfirm(message: string, opts: Omit<DialogOptions, 'message'> = {}): Promise<boolean> {
  return open('confirm', { ...opts, message })
}
