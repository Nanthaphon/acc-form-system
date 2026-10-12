import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AnnouncementsPage from './AnnouncementsPage'
import {
  ANNOUNCEMENTS, KIND_LABEL, hasUnreadAnnouncement, latestAnnouncementDate, markAnnouncementsSeen,
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

  it('says of each change whether it is new, a fix or an improvement', () => {
    show()
    const first = screen.getAllByRole('heading', { level: 2 })[0].closest('section') as HTMLElement
    for (const item of ANNOUNCEMENTS[0].items) {
      expect(within(first).getAllByText(KIND_LABEL[item.kind]).length).toBeGreaterThan(0)
    }
    expect(within(first).getByText(ANNOUNCEMENTS[0].items[0].text)).toBeInTheDocument()
  })

  it('prints the date the way the rest of the system does', () => {
    show()
    const [y, m, d] = ANNOUNCEMENTS[0].date.split('-')
    expect(screen.getByText(`${d}/${m}/${y}`)).toBeInTheDocument()
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
