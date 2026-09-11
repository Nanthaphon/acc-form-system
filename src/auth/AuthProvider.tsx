import { createContext, useContext, useEffect, useRef, useState } from 'react'
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
  const uidRef = useRef<string | null | undefined>(undefined) // undefined = no session event yet

  async function loadProfile(uid: string | null) {
    const p = uid ? await getProfileByUid(uid) : null
    if (uidRef.current === uid) setProfile(p) // ignore a load overtaken by a sign-in/out
  }

  useEffect(() => {
    // Fires INITIAL_SESSION right away, then on every sign-in/out and token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      const uid = u?.id ?? null
      // A token refresh (e.g. on returning to the tab) keeps the same user: keep
      // the same objects too, so pages don't re-render and refetch everything.
      if (uid === uidRef.current) return
      uidRef.current = uid
      setUser(u)
      // Never await a Supabase call inside this callback: the auth lock is held
      // while it runs, so the query would wait on it forever and every request
      // after it would hang — the app looks frozen. Defer it instead.
      setTimeout(() => { loadProfile(uid).finally(() => setLoading(false)) }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ user, profile, loading, refresh: () => loadProfile(user?.id ?? null) }}>{children}</Ctx.Provider>
}
