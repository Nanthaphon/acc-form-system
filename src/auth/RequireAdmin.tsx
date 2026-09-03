import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import PageLoader from '../components/Spinner'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
