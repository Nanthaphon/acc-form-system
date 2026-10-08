import { describe, expect, it, vi } from 'vitest'

// Deleting a document removes every file stored under it: the attachments and
// the pictures in its table — and nothing that belongs to another document.
const row = {
  attachments: [{ path: 's1/receipt.pdf' }],
  items: [
    { name: 'นภา', book: 's1/img-a.jpg', note: 'ดูรูป' },
    { name: 'ธีรวัฒน์', book: '' },
    { name: 'กิตติ', book: 's2/img-other.jpg' }, // a stray path into another document
  ],
}
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: row }) }) }),
      delete: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{ id: 's1' }], error: null }) }) }),
    }),
  },
}))
const { deleteAttachmentFiles } = vi.hoisted(() => ({ deleteAttachmentFiles: vi.fn() }))
vi.mock('./attachments', () => ({ deleteAttachmentFiles }))

const { deleteSubmission } = await import('./submissions')

describe('deleteSubmission', () => {
  it('removes the attachments and the pictures in the table', async () => {
    await deleteSubmission('s1')
    expect(deleteAttachmentFiles).toHaveBeenCalledWith(['s1/receipt.pdf', 's1/img-a.jpg'])
  })
})
