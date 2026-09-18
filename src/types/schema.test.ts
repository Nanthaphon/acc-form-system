import { describe, it, expect } from 'vitest'
import { sectionTitles, DEFAULT_REQUESTER_TITLE, DEFAULT_ITEMS_TITLE } from './schema'

describe('sectionTitles', () => {
  it('falls back to the built-in wording when a form never set them', () => {
    expect(sectionTitles({})).toEqual({ requester: DEFAULT_REQUESTER_TITLE, items: DEFAULT_ITEMS_TITLE })
  })
  it('falls back for a form loaded before the migration (undefined settings)', () => {
    expect(sectionTitles(null)).toEqual({ requester: DEFAULT_REQUESTER_TITLE, items: DEFAULT_ITEMS_TITLE })
    expect(sectionTitles()).toEqual({ requester: DEFAULT_REQUESTER_TITLE, items: DEFAULT_ITEMS_TITLE })
  })
  it('uses the form\u2019s own headings', () => {
    expect(sectionTitles({ requesterTitle: 'ผู้รับเงิน', itemsTitle: 'รายการรับ/คืนเงิน' }))
      .toEqual({ requester: 'ผู้รับเงิน', items: 'รายการรับ/คืนเงิน' })
  })
  it('treats blank or whitespace-only headings as "not set"', () => {
    expect(sectionTitles({ requesterTitle: '', itemsTitle: '   ' }))
      .toEqual({ requester: DEFAULT_REQUESTER_TITLE, items: DEFAULT_ITEMS_TITLE })
  })
  it('trims surrounding spaces', () => {
    expect(sectionTitles({ requesterTitle: '  ผู้ขอเบิก  ' }).requester).toBe('ผู้ขอเบิก')
  })
})
