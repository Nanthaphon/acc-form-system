import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import PageLoader from '../components/Spinner'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const { pathname } = useLocation()
  if (loading) return <PageLoader label="กำลังเข้าสู่ระบบ..." />
  if (!user) return <Navigate to="/login" replace />
  // A new account's password IS its username, and nothing used to make anyone
  // change it — the dashboard only showed a note, so a guessable password could
  // be kept for good. Until it is changed, the only page reachable is the one
  // that changes it. Keying off a loaded profile means a failed profile load
  // never locks anyone out.
  if (profile?.mustChangePassword && pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return <>{children}</>
}
