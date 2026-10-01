import { describe, expect, it, vi, beforeEach } from 'vitest'

// The sidebar count has to be told whenever a document's waiting state changes,
// including a delete — a count left over for a document that no longer exists
// is what the admin saw.
let deleteAnswer: { data: { id: string }[]; error: null } = { data: [{ id: 's1' }], error: null }
const rpc = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { attachments: [] } }) }) }),
      delete: () => ({ eq: () => ({ select: () => Promise.resolve(deleteAnswer) }) }),
    }),
    rpc: (...a: unknown[]) => rpc(...a),
  },
}))
vi.mock('./attachments', () => ({ deleteAttachmentFiles: vi.fn() }))

const { deleteSubmission, cancelSigning } = await import('./submissions')
const { onPendingSignChanged } = await import('../shared/pendingSignBus')

describe('the sign count is told when a document changes hands', () => {
  let heard: number
  let stop: () => void
  beforeEach(() => {
    heard = 0
    stop?.()
    stop = onPendingSignChanged(() => { heard++ })
    rpc.mockReset().mockResolvedValue({ error: null })
    deleteAnswer = { data: [{ id: 's1' }], error: null }
  })

  it('announces a deleted document, so a count waiting on it clears', async () => {
    await deleteSubmission('s1')
    expect(heard).toBe(1)
  })

  it('says nothing when the delete was refused', async () => {
    deleteAnswer = { data: [], error: null }
    await expect(deleteSubmission('s1')).rejects.toThrow()
    expect(heard).toBe(0)
  })

  it('announces a cancelled signing request', async () => {
    await cancelSigning('s1')
    expect(heard).toBe(1)
  })
})
