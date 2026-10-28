import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// `npm run dev:staging` without .env.staging.local would quietly fall back to
// .env.local — the real database — under a page that believes it is a test.
if (import.meta.env.MODE === 'staging' && import.meta.env.VITE_APP_ENV !== 'staging') {
  throw new Error('ยังไม่ได้ตั้งค่าระบบทดสอบ — คัดลอก .env.staging.example เป็น .env.staging.local แล้วใส่ค่าของ project ทดสอบ (docs/environments.md)')
}

export const supabase = createClient(url, anon)

// Separate client for admin-side account creation, so creating an employee
// does NOT replace the admin's own session. Its own storage key + no persistence.
export const supabaseSecondary = createClient(url, anon, {
  auth: { storageKey: 'sb-secondary-auth', persistSession: false, autoRefreshToken: false },
})
