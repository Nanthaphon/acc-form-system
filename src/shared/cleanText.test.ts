import { describe, it, expect } from 'vitest'
import { cleanHeader, cleanRow, cleanText } from './cleanText'

describe('cleanText', () => {
  it('cuts spaces, non-breaking and zero-width marks from both ends only', () => {
    expect(cleanText('0582832579          ')).toBe('0582832579')
    expect(cleanText('\u00A0\u200B pc1305161\uFEFF\t\n')).toBe('pc1305161')
    expect(cleanText('  นายพักดี  สีฉะสม ')).toBe('นายพักดี  สีฉะสม')
    expect(cleanText(null)).toBe('')
    expect(cleanText(12)).toBe('12')
  })

  it('cleans a row\'s text and leaves its numbers alone', () => {
    expect(cleanRow({ account: '0062446613  ', days: 3, unit: ' 150 ' })).toEqual({ account: '0062446613', days: 3, unit: '150' })
  })

  it('cleans the requester\'s details and the header fields', () => {
    const h = cleanHeader({
      subject: ' s ', categories: [], companyId: 'globe', firstName: ' ก ', lastName: 'ข\u00A0', position: 'ค ', job: ' ง',
      fields: { a: ' x ' },
    })
    expect([h.firstName, h.lastName, h.position, h.job, h.fields?.a]).toEqual(['ก', 'ข', 'ค', 'ง', 'x'])
    expect(h.subject).toBe(' s ')   // only what the sheet shows as the requester's own
  })
})
