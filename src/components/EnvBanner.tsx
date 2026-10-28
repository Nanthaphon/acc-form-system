import { FlaskConical } from 'lucide-react'

// Which system this is, when it is not the real one: `demo` (npm run dev:demo,
// made-up data in the browser) or `staging` (the test database). Unset on the
// production build, which shows nothing. See docs/environments.md.
const ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? ''

const TEXT: Record<string, string> = {
  demo: 'โหมดเดโม — ข้อมูลสมมติ ไม่บันทึกจริง (รีเฟรชแล้วเริ่มใหม่)',
  staging: 'ระบบทดสอบ — ไม่ใช่ข้อมูลจริง',
}

export default function EnvBanner() {
  const text = TEXT[ENV]
  if (!text) return null
  return (
    <div role="status" className="no-print pointer-events-none fixed bottom-3 left-1/2 z-[150] -translate-x-1/2">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-ochre-700 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
        <FlaskConical size={14} /> {text}
      </span>
    </div>
  )
}
