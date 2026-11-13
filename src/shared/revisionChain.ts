import type { SubmissionSummary } from '../types/schema'

// A document that was signed and found wrong is corrected by issuing a new one
// in its place: the new one points back at the one it replaces, which is
// cancelled. Left flat, a list shows every round as a separate document and the
// wrong copies sit between the right ones.
//
// These group a list into chains — the document as it stands now, with the
// rounds before it folded underneath, newest first.
export interface DocChain {
  latest: SubmissionSummary
  older: SubmissionSummary[]   // newest correction first, the original last
}

// `all` is every document the page has, so a chain is complete even when the
// filters would have hidden an earlier round.
export function chainRows(rows: SubmissionSummary[], all: SubmissionSummary[] = rows): DocChain[] {
  const byId = new Map(all.map(r => [r.id, r]))
  // Walk back one round at a time; `seen` keeps a circular link (which the
  // database should never allow) from spinning here.
  const walk = (latest: SubmissionSummary): SubmissionSummary[] => {
    const older: SubmissionSummary[] = []
    const seen = new Set([latest.id])
    let cur = latest
    for (;;) {
      const prevId = cur.replaces?.id
      if (!prevId || seen.has(prevId)) break
      const prev = byId.get(prevId)
      if (!prev) break
      older.push(prev)
      seen.add(prev.id)
      cur = prev
    }
    return older
  }

  const chains = new Map(rows.map(r => [r.id, walk(r)]))
  // A round is folded away only when the document that replaced it is itself on
  // the list: hidden by a filter, the earlier one stands on its own rather than
  // disappearing from the page altogether.
  const folded = new Set<string>()
  for (const [id, older] of chains) for (const o of older) if (o.id !== id) folded.add(o.id)

  const open = rows.filter(r => !folded.has(r.id))
  // Every round folded into another (documents that replace each other) would
  // empty the page; show them flat instead of not at all.
  if (!open.length && rows.length) return rows.map(latest => ({ latest, older: [] }))
  return open.map(latest => ({ latest, older: chains.get(latest.id) ?? [] }))
}

// How many documents a chain holds in all — what the fold says on its face.
export function chainLength(c: DocChain): number {
  return c.older.length + 1
}
