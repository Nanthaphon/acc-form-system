import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, anon)

// Separate client for admin-side account creation, so creating an employee
// does NOT replace the admin's own session. Its own storage key + no persistence.
export const supabaseSecondary = createClient(url, anon, {
  auth: { storageKey: 'sb-secondary-auth', persistSession: false, autoRefreshToken: false },
})
