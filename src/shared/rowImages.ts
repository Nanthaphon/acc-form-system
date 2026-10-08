import type { ExpenseRow, FormColumn } from '../types/schema'

// Pictures in the table: an "image" column holds one picture per row (a bank
// book, an ID card…). While the document is being filled in, a freshly picked
// picture sits in its cell as a "pending:<id>" token; saving uploads it and
// swaps the token for its storage path, `<submissionId>/img-<uuid>.jpg`.

export const PENDING_PREFIX = 'pending:'

export const isPending = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PENDING_PREFIX)

export function newPendingToken(): string {
  return PENDING_PREFIX + crypto.randomUUID()
}

export function rowImagePath(subId: string): string {
  return `${subId}/img-${crypto.randomUUID()}.jpg`
}

const imageCols = (columns: FormColumn[]) => columns.filter(c => c.type === 'image')

// Every picture value on the document — paths and pending tokens alike.
export function imageValues(columns: FormColumn[], items: ExpenseRow[]): string[] {
  const cols = imageCols(columns)
  return items.flatMap(r => cols.map(c => r[c.key])).filter((v): v is string => typeof v === 'string' && v !== '')
}

// The stored pictures (not the pending ones), for fetching their URLs.
export function storedImagePaths(columns: FormColumn[], items: ExpenseRow[]): string[] {
  return imageValues(columns, items).filter(v => !isPending(v))
}

// Swap each pending token for the path it will be stored under. Returns the
// rows to save and the uploads still to do (token → path).
export function resolvePending(
  columns: FormColumn[], items: ExpenseRow[], subId: string,
): { items: ExpenseRow[]; uploads: { token: string; path: string }[] } {
  const cols = imageCols(columns)
  const uploads: { token: string; path: string }[] = []
  const out = items.map(r => {
    let row = r
    for (const c of cols) {
      const v = r[c.key]
      if (!isPending(v)) continue
      const path = rowImagePath(subId)
      uploads.push({ token: v, path })
      row = { ...row, [c.key]: path }
    }
    return row
  })
  return { items: out, uploads }
}

// A copied document starts without the pictures: they belong to the original,
// and would vanish with it.
export function withoutImages(columns: FormColumn[], items: ExpenseRow[]): ExpenseRow[] {
  const cols = imageCols(columns)
  if (!cols.length) return items
  return items.map(r => ({ ...r, ...Object.fromEntries(cols.map(c => [c.key, ''])) }))
}

// The pictures as the printed document numbers them — row by row, left to
// right — each with what identifies its row: the first text filled in on it
// (a name, a code), so a picture on the attachment page can be matched to its line.
export interface NumberedImage { no: number; value: string; row: number; column: string; label: string }
export function numberImages(columns: FormColumn[], items: ExpenseRow[]): NumberedImage[] {
  const cols = imageCols(columns).filter(c => !c.hidden)
  const texts = columns.filter(c => c.type === 'text' && !c.hidden)
  const out: NumberedImage[] = []
  items.forEach((r, i) => {
    for (const c of cols) {
      const v = r[c.key]
      if (typeof v !== 'string' || v === '') continue
      const label = texts.map(t => String(r[t.key] ?? '').trim()).find(Boolean) ?? ''
      out.push({ no: out.length + 1, value: v, row: i + 1, column: c.label.replace(/\s+/g, ' ').trim(), label })
    }
  })
  return out
}

// Phone photos are several MB; a bank book or an ID card stays readable at
// 1600px on the long side as a JPEG, at a few hundred KB.
export const MAX_IMAGE_SIDE = 1600
export async function shrinkImage(file: File, maxSide = MAX_IMAGE_SIDE): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('อ่านรูปนี้ไม่ได้'))
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('ย่อรูปไม่ได้')
    ctx.fillStyle = '#ffffff' // a transparent PNG would turn black as a JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('ย่อรูปไม่ได้'))), 'image/jpeg', 0.82))
  } finally {
    URL.revokeObjectURL(url)
  }
}
