import { createClient } from '@supabase/supabase-js'
import { assertStagingIsSeparate } from './envGuard'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// `npm run dev:staging` without .env.staging.local would quietly fall back to
// .env.local — the real database — under a page that believes it is a test.
// The same goes for a staging file that sets the flag but leaves out (or
// mistypes) the URL: Vite then takes the real one from .env.local.
// It used to throw, which left a white page; envGuard says what to do instead.
assertStagingIsSeparate(url, import.meta.env.VITE_APP_ENV, import.meta.env.MODE)

export const supabase = createClient(url, anon)

// Separate client for admin-side account creation, so creating an employee
// does NOT replace the admin's own session. Its own storage key + no persistence.
export const supabaseSecondary = createClient(url, anon, {
  auth: { storageKey: 'sb-secondary-auth', persistSession: false, autoRefreshToken: false },
})
