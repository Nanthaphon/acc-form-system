import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { onAuthStateChange, getProfileByUid } = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(), getProfileByUid: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({ supabase: { auth: { onAuthStateChange } } }))
vi.mock('../data/users', () => ({ getProfileByUid }))

const { AuthProvider, useAuth, PROFILE_WAIT_MS } = await import('./AuthProvider')

function Probe() {
  const { loading, user, profile } = useAuth()
  return <div>{loading ? 'loading' : `open:${user?.id ?? '-'}:${profile?.employeeId ?? '-'}`}</div>
}

const session = { user: { id: 'u1' } }
let fire: (event: string, session: unknown) => void

describe('AuthProvider', () => {
  beforeEach(() => {
    getProfileByUid.mockReset()
    onAuthStateChange.mockReset().mockImplementation((cb: typeof fire) => {
      fire = cb
      return { data: { subscription: { unsubscribe: () => {} } } }
    })
  })

  it('opens the app with the profile once it arrives', async () => {
    getProfileByUid.mockResolvedValue({ employeeId: '1010122' })
    render(<AuthProvider><Probe /></AuthProvider>)
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(async () => { fire('INITIAL_SESSION', session) })
    await waitFor(() => expect(screen.getByText('open:u1:1010122')).toBeInTheDocument())
  })

  it('lets a signed-out visitor straight through to the login page', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await act(async () => { fire('INITIAL_SESSION', null) })
    await waitFor(() => expect(screen.getByText('open:-:-')).toBeInTheDocument())
    expect(getProfileByUid).not.toHaveBeenCalled()
  })

  // The bug this guards: a profile query that never settles (another tab sitting
  // on the auth lock) left the app on "กำลังเข้าสู่ระบบ..." for good.
  it('opens anyway when the profile query hangs', async () => {
    vi.useFakeTimers()
    getProfileByUid.mockReturnValue(new Promise(() => {}))
    render(<AuthProvider><Probe /></AuthProvider>)
    act(() => { fire('INITIAL_SESSION', session) })
    expect(screen.getByText('loading')).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(PROFILE_WAIT_MS) })
    expect(screen.getByText('open:u1:-')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
