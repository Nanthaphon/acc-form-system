import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="p-8">กำลังโหลด...</div>
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
