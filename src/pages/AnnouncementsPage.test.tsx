import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AnnouncementsPage from './AnnouncementsPage'
import {
  ANNOUNCEMENTS, KIND_HEADING, hasUnreadAnnouncement, latestAnnouncementDate, markAnnouncementsSeen,
} from '../shared/announcements'

const show = () => render(<MemoryRouter><AnnouncementsPage /></MemoryRouter>)

beforeEach(() => { try { localStorage.clear() } catch { /* blocked */ } })

describe('the announcements page', () => {
  it('lists what changed, newest first', () => {
    show()
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings).toHaveLength(ANNOUNCEMENTS.length)
    expect(headings[0]).toHaveTextContent(ANNOUNCEMENTS[0].title)
  })

  it('lists each release\'s changes under เพิ่มใหม่ / ปรับปรุง / แก้ไขข้อผิดพลาด', () => {
    show()
    const first = screen.getAllByRole('heading', { level: 2 })[0].closest('section') as HTMLElement
    for (const item of ANNOUNCEMENTS[0].items) {
      const heading = within(first).getByRole('heading', { level: 3, name: KIND_HEADING[item.kind] })
      expect(heading.parentElement).toHaveTextContent(item.text)
    }
  })

  it('names each release by its version and prints its date the way the rest of the system does', () => {
    show()
    const first = screen.getAllByRole('heading', { level: 2 })[0].closest('section') as HTMLElement
    const [y, m, d] = ANNOUNCEMENTS[0].date.split('-')
    expect(first).toHaveTextContent(`v${ANNOUNCEMENTS[0].version}`)
    expect(within(first).getByText(`${d}/${m}/${y}`)).toBeInTheDocument()
  })

  it('lists every version beside the notes, each one a link to its release', () => {
    show()
    const nav = screen.getByRole('navigation', { name: 'เวอร์ชัน' })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(ANNOUNCEMENTS.length)
    expect(links[0]).toHaveAttribute('href', `#v${ANNOUNCEMENTS[0].version}`)
  })

  it('marks what only admins see', () => {
    show()
    const adminItems = ANNOUNCEMENTS.flatMap(a => a.items).filter(i => i.admin)
    expect(screen.getAllByText('ผู้ดูแลระบบ')).toHaveLength(adminItems.length)
  })

  it('marks the newest as ใหม่ until it has been read', () => {
    show()
    expect(screen.getByText('ใหม่')).toBeInTheDocument()
  })

  it('reading the page is what marks it read', () => {
    expect(hasUnreadAnnouncement()).toBe(true)
    show()
    expect(hasUnreadAnnouncement()).toBe(false)
    expect(localStorage.getItem('announcements:seen')).toBe(latestAnnouncementDate())
  })

  it('does not call it ใหม่ once it has been', () => {
    markAnnouncementsSeen()
    show()
    expect(screen.queryByText('ใหม่')).not.toBeInTheDocument()
  })
})

describe('the release list itself', () => {
  it('runs newest first, one release a day, each with its own version', () => {
    const dates = ANNOUNCEMENTS.map(a => a.date)
    expect([...dates].sort().reverse()).toEqual(dates)
    expect(new Set(dates).size).toBe(dates.length)
    const versions = ANNOUNCEMENTS.map(a => a.version)
    expect(new Set(versions).size).toBe(versions.length)
    // each version above the one before it: 1.9 < 1.10 < 1.11 < 2.0
    const num = (v: string) => v.split('.').map(Number)
    for (let i = 0; i + 1 < versions.length; i++) {
      const [a1, b1] = num(versions[i]), [a2, b2] = num(versions[i + 1])
      expect(a1 > a2 || (a1 === a2 && b1 > b2)).toBe(true)
    }
  })
})
