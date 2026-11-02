import { describe, expect, it } from 'vitest'
import { checkSupportImages, isUnread, MAX_SUPPORT_IMAGES } from './support'
import type { SupportTicket } from './support'

const ticket = (o: Partial<SupportTicket>): SupportTicket => ({
  id: 't1', createdBy: 'emp', reporterName: 'ก ข', subject: 's', page: '/', status: 'open', createdAt: 1,
  lastMessageAt: 100, lastByReporter: true, lastPreview: '', messageCount: 1, reporterReadAt: 100, staffReadAt: 0, ...o,
})

describe('which conversations wait on whom', () => {
  it('a reporter\'s own message waits on the admins, not on the reporter', () => {
    const t = ticket({})
    expect(isUnread(t, 'emp', false)).toBe(false)
    expect(isUnread(t, 'adm', true)).toBe(true)
  })

  it('an admin\'s reply waits on the reporter until they open it', () => {
    const t = ticket({ lastByReporter: false, lastMessageAt: 200, staffReadAt: 200 })
    expect(isUnread(t, 'emp', false)).toBe(true)
    expect(isUnread({ ...t, reporterReadAt: 250 }, 'emp', false)).toBe(false)
    expect(isUnread(t, 'adm', true)).toBe(false)
  })

  it('one admin opening it clears it for the admin side', () => {
    expect(isUnread(ticket({ staffReadAt: 150 }), 'adm', true)).toBe(false)
  })

  it('an employee never sees someone else\'s conversation as waiting', () => {
    expect(isUnread(ticket({}), 'other', false)).toBe(false)
  })

  it('an admin\'s own conversation is read from the reporter side', () => {
    const own = ticket({ createdBy: 'adm' })
    expect(isUnread(own, 'adm', true)).toBe(false)
    expect(isUnread({ ...own, lastByReporter: false, lastMessageAt: 300 }, 'adm', true)).toBe(true)
  })

  it('an empty conversation waits on nobody', () => {
    expect(isUnread(ticket({ lastMessageAt: null }), 'adm', true)).toBe(false)
  })
})

describe('pictures in a message', () => {
  const png = (name = 'a.png', size = 1000) => ({ name, size, type: 'image/png' })

  it('takes a few pictures', () => {
    expect(checkSupportImages(0, [png(), png('b.png')])).toBeNull()
  })
  it(`stops at ${MAX_SUPPORT_IMAGES} per message`, () => {
    expect(checkSupportImages(MAX_SUPPORT_IMAGES - 1, [png(), png()])).toMatch(/สูงสุด/)
  })
  it('takes pictures only', () => {
    expect(checkSupportImages(0, [{ name: 'x.pdf', size: 10, type: 'application/pdf' }])).toMatch(/ไม่ใช่รูปภาพ/)
  })
  it('refuses a picture over 5 MB', () => {
    expect(checkSupportImages(0, [png('big.png', 6 * 1024 * 1024)])).toMatch(/5 MB/)
  })
})
