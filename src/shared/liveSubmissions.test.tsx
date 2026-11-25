import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLiveSubmissions } from './liveSubmissions'

function Page({ reload }: { reload: () => void }) {
  useLiveSubmissions(reload)
  return null
}

describe('useLiveSubmissions', () => {
  afterEach(() => vi.useRealTimers())

  it('loads the list again when the tab comes back to the front — one reload for a burst', () => {
    vi.useFakeTimers()
    const reload = vi.fn()
    render(<Page reload={reload} />)
    act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')) })
    expect(reload).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(500) })
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('stops listening once the page is left', () => {
    vi.useFakeTimers()
    const reload = vi.fn()
    const { unmount } = render(<Page reload={reload} />)
    unmount()
    act(() => { window.dispatchEvent(new Event('focus')); vi.advanceTimersByTime(500) })
    expect(reload).not.toHaveBeenCalled()
  })
})
