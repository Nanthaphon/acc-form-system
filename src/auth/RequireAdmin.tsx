import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import PageLoader from '../components/Spinner'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  // AuthProvider opens the app before the profile arrives rather than hang on a
  // slow query, so a signed-in admin can reach this with profile still null —
  // redirecting then threw them off their own pages. Wait for it instead.
  if (loading || (user && !profile)) return <PageLoader />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
