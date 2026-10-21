import type { ExpenseHeader, ExpenseRow } from '../types/schema'

// What has been typed into a form and not yet saved, kept in this browser so
// that leaving for another menu — or closing the tab — does not throw it
// away. One draft per person per document: a new one of each form, a copy of
// a document, or an existing document being edited. Files picked to attach
// are not kept: a browser cannot hold them.

export interface FormDraft { header: ExpenseHeader; items: ExpenseRow[]; savedAt: number }

const PREFIX = 'formDraft:v1'

export function formDraftKey(uid: string, doc: { id?: string | null; cloneId?: string | null; formType?: string | null }): string | null {
  if (!uid) return null
  if (doc.id) return `${PREFIX}:${uid}:doc:${doc.id}`
  if (doc.cloneId) return `${PREFIX}:${uid}:clone:${doc.cloneId}`
  if (doc.formType) return `${PREFIX}:${uid}:new:${doc.formType}`
  return null
}

// Storage can be blocked or full; a draft is a convenience, never a reason to fail.
export function readFormDraft(key: string | null): FormDraft | null {
  if (!key) return null
  try {
    const d = JSON.parse(localStorage.getItem(key) ?? 'null') as FormDraft | null
    return d && d.header && Array.isArray(d.items) && typeof d.savedAt === 'number' ? d : null
  } catch { return null }
}

export function writeFormDraft(key: string | null, header: ExpenseHeader, items: ExpenseRow[], now = Date.now()): void {
  if (!key) return
  try { localStorage.setItem(key, JSON.stringify({ header, items, savedAt: now } satisfies FormDraft)) } catch { /* nothing to do */ }
}

export function clearFormDraft(key: string | null): void {
  if (!key) return
  try { localStorage.removeItem(key) } catch { /* nothing to do */ }
}

// A draft of an existing document is only worth restoring if it was written
// after the document was last saved — otherwise someone (perhaps this person,
// elsewhere) has saved over it since, and it would put old content back.
export function draftStillCurrent(d: FormDraft, docUpdatedAt = 0): boolean {
  return d.savedAt > docUpdatedAt
}
