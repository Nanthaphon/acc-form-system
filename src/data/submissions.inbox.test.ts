import { describe, expect, it, vi } from 'vitest'

// Every query step is recorded, so the test can see what was asked of the database.
const calls: [string, ...unknown[]][] = []
const query: Record<string, unknown> = {}
for (const step of ['select', 'contains', 'neq', 'order', 'eq']) {
  query[step] = (...a: unknown[]) => { calls.push([step, ...a]); return query }
}
// awaited at the end of the chain: a count, or rows
;(query as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 })
vi.mock('../lib/supabase', () => ({ supabase: { from: () => query } }))

const { countMyPendingToSign, listMyAssigned } = await import('./submissions')

// Signing a line of one's own document (เซ็นตรงนี้ on ผู้อนุมัติ) assigns that
// line to oneself — the document then turned up in ฟอร์มเอกสารรอเซ็น and in
// the sidebar count, as if someone else were waiting on you.
describe('ฟอร์มเอกสารรอเซ็น — never one’s own documents', () => {
  it('the list leaves out documents the person created', async () => {
    calls.length = 0
    await listMyAssigned('me')
    expect(calls).toContainEqual(['neq', 'createdBy', 'me'])
  })

  it('so does the count on the menu', async () => {
    calls.length = 0
    await countMyPendingToSign('me')
    expect(calls).toContainEqual(['neq', 'createdBy', 'me'])
  })
})
