import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePendingSignCount } from './usePendingSignCount'
import { notifyPendingSignChanged } from './pendingSignBus'

const { countMyPendingToSign } = vi.hoisted(() => ({ countMyPendingToSign: vi.fn() }))
vi.mock('../data/submissions', () => ({ countMyPendingToSign }))

describe('usePendingSignCount', () => {
  beforeEach(() => { countMyPendingToSign.mockReset().mockResolvedValue(1) })
  afterEach(() => { vi.useRealTimers() })

  it('reads the count for the signed-in user', async () => {
    const { result } = renderHook(() => usePendingSignCount('u1'))
    await waitFor(() => expect(result.current).toBe(1))
    expect(countMyPendingToSign).toHaveBeenCalledWith('u1')
  })

  it('stays at zero and asks nothing while nobody is signed in', () => {
    const { result } = renderHook(() => usePendingSignCount(undefined))
    expect(result.current).toBe(0)
    expect(countMyPendingToSign).not.toHaveBeenCalled()
  })

  it('refetches when a signature action fires in this tab', async () => {
    renderHook(() => usePendingSignCount('u1'))
    await waitFor(() => expect(countMyPendingToSign).toHaveBeenCalledTimes(1))
    countMyPendingToSign.mockResolvedValue(3)
    await act(async () => { notifyPendingSignChanged() })
    expect(countMyPendingToSign).toHaveBeenCalledTimes(2)
  })

  it('refetches when the tab comes back to the front', async () => {
    renderHook(() => usePendingSignCount('u1'))
    await waitFor(() => expect(countMyPendingToSign).toHaveBeenCalledTimes(1))
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(countMyPendingToSign).toHaveBeenCalledTimes(2)
  })

  it('keeps checking on a timer while the tab is visible, and stops when hidden', async () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => usePendingSignCount('u1', 1000))
    expect(countMyPendingToSign).toHaveBeenCalledTimes(1)
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(countMyPendingToSign).toHaveBeenCalledTimes(4)

    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(countMyPendingToSign).toHaveBeenCalledTimes(4) // a hidden tab asks nothing
    hidden.mockRestore()

    unmount()
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(countMyPendingToSign).toHaveBeenCalledTimes(4) // and the timer is cleared
  })
})
