import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">กำลังโหลด...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
