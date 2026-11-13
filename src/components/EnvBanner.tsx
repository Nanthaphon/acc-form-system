import { FlaskConical, RotateCcw } from 'lucide-react'

// Which system this is, when it is not the real one: `demo` (npm run dev:demo,
// made-up data kept in this browser) or `staging` (the test database). Unset on
// the production build, which shows nothing. See docs/environments.md.
const ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? ''

const TEXT: Record<string, string> = {
  demo: 'โหมดเดโม — ข้อมูลสมมติ เก็บไว้ในเบราว์เซอร์นี้เท่านั้น',
  staging: 'ระบบทดสอบ — ไม่ใช่ข้อมูลจริง',
}

// The demo keeps what is typed into it (demo/fakeSupabase), so a trial can run
// over days instead of ending at the next refresh. This throws that away and
// starts from the sample data again.
function resetDemo() {
  const reset = (window as unknown as { __demoReset?: () => void }).__demoReset
  if (reset) reset()
  else location.reload()
}

export default function EnvBanner() {
  const text = TEXT[ENV]
  if (!text) return null
  return (
    <div role="status" className="no-print fixed bottom-3 left-1/2 z-[150] -translate-x-1/2">
      <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-ochre-700 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
        <FlaskConical size={14} /> {text}
        {ENV === 'demo' && (
          <button
            type="button"
            onClick={resetDemo}
            title="ลบข้อมูลที่ลองไว้ทั้งหมด แล้วเริ่มจากข้อมูลตัวอย่างใหม่"
            className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 font-medium transition-colors hover:bg-white/25"
          >
            <RotateCcw size={12} /> เริ่มใหม่
          </button>
        )}
      </span>
    </div>
  )
}
