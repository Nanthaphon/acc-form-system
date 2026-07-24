import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getProfileByUid } from '../data/users'
import type { UserProfile } from '../types/schema'

interface AuthCtx { user: User | null; profile: UserProfile | null; loading: boolean; refresh: () => Promise<void> }
const Ctx = createContext<AuthCtx>({ user: null, profile: null, loading: true, refresh: async () => {} })
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(u: User | null) {
    setProfile(u ? await getProfileByUid(u.id) : null)
  }
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u); await loadProfile(u); setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null
      setUser(u); await loadProfile(u)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ user, profile, loading, refresh: () => loadProfile(user) }}>{children}</Ctx.Provider>
}
