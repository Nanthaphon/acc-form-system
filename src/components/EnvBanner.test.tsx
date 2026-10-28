import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
const show = async () => { const { default: EnvBanner } = await import('./EnvBanner'); render(<EnvBanner />) }

// Whoever is looking at a test system must not mistake it for the real one.
describe('EnvBanner', () => {
  it('says a test system is not the real one', async () => {
    vi.stubEnv('VITE_APP_ENV', 'staging')
    await show()
    expect(screen.getByRole('status')).toHaveTextContent('ระบบทดสอบ')
  })

  it('says the demo holds made-up data', async () => {
    vi.stubEnv('VITE_APP_ENV', 'demo')
    await show()
    expect(screen.getByRole('status')).toHaveTextContent('ข้อมูลสมมติ')
  })

  it('shows nothing on the real system', async () => {
    vi.stubEnv('VITE_APP_ENV', '')
    await show()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
