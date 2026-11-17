// Text as it was meant, without the blank space it picked up on the way in —
// a value pasted from Excel, LINE or a bank statement often carries trailing
// spaces, non-breaking spaces or invisible zero-width marks. Inside the text
// nothing is touched; only the ends are cut.

import type { ExpenseHeader, ExpenseRow } from '../types/schema'

// \s already covers ordinary, non-breaking and ideographic spaces, tabs and
// line breaks; the zero-width marks and the byte-order mark it does not.
const EDGES = /^[\s​-‍⁠﻿]+|[\s​-‍⁠﻿]+$/g

/** The text with blank space cut from both ends. */
export function cleanText(v: unknown): string {
  return String(v ?? '').replace(EDGES, '')
}

/** A row with every text value cut clean; numbers and the rest stay as they are. */
export function cleanRow(row: ExpenseRow): ExpenseRow {
  const out: ExpenseRow = {}
  for (const [k, v] of Object.entries(row)) out[k] = typeof v === 'string' ? cleanText(v) : v
  return out
}

/** The requester's own details cut clean, as they are stored. */
export function cleanHeader(header: ExpenseHeader): ExpenseHeader {
  const out = { ...header }
  for (const k of ['firstName', 'lastName', 'position', 'job'] as const) {
    if (typeof out[k] === 'string') out[k] = cleanText(out[k])
  }
  if (out.fields) {
    out.fields = Object.fromEntries(Object.entries(out.fields).map(([k, v]) => [k, typeof v === 'string' ? cleanText(v) : v]))
  }
  return out
}
