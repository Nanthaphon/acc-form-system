// A tiny promise-based dialog service so any code can show a styled alert/confirm/
// prompt modal without prop-threading. A single <DialogHost/> (mounted at the app
// root) subscribes and renders. Requests are queued so overlapping calls are safe.
export type DialogTone = 'default' | 'danger' | 'success'

export interface DialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: DialogTone
  defaultValue?: string   // prompt only — initial input value
  placeholder?: string    // prompt only — input placeholder
}

export interface DialogRequest extends DialogOptions {
  id: number
  kind: 'alert' | 'confirm' | 'prompt'
  resolve: (ok: boolean, value?: string) => void
}

let seq = 0
let current: DialogRequest | null = null
const queue: DialogRequest[] = []
const listeners = new Set<() => void>()

function emit() { listeners.forEach(l => l()) }
function pump() { if (!current && queue.length > 0) { current = queue.shift()!; emit() } }
function enqueue(req: DialogRequest) { queue.push(req); pump() }

export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function getCurrent() { return current }

export function resolveCurrent(ok: boolean, value?: string) {
  if (!current) return
  const c = current
  current = null
  c.resolve(ok, value)
  emit()
  pump()
}

// Styled replacement for window.alert — resolves when dismissed.
export function uiAlert(message: string, opts: Omit<DialogOptions, 'message'> = {}): Promise<boolean> {
  return new Promise<boolean>(res => enqueue({ id: ++seq, kind: 'alert', tone: 'default', ...opts, message, resolve: ok => res(ok) }))
}
// Styled replacement for window.confirm — resolves true (confirmed) / false (cancelled).
export function uiConfirm(message: string, opts: Omit<DialogOptions, 'message'> = {}): Promise<boolean> {
  return new Promise<boolean>(res => enqueue({ id: ++seq, kind: 'confirm', tone: 'default', ...opts, message, resolve: ok => res(ok) }))
}
// Styled replacement for window.prompt — resolves the entered string, or null if cancelled.
export function uiPrompt(message: string, opts: Omit<DialogOptions, 'message'> = {}): Promise<string | null> {
  return new Promise<string | null>(res => enqueue({ id: ++seq, kind: 'prompt', tone: 'default', ...opts, message, resolve: (ok, value) => res(ok ? (value ?? '') : null) }))
}
