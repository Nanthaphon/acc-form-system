import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import PageLoader from '../components/Spinner'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader label="กำลังเข้าสู่ระบบ..." />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
