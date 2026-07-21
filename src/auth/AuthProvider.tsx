import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
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
    setProfile(u ? await getProfileByUid(u.uid) : null)
  }
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u); await loadProfile(u); setLoading(false)
  }), [])

  return <Ctx.Provider value={{ user, profile, loading, refresh: () => loadProfile(user) }}>{children}</Ctx.Provider>
}
