import { Loader2 } from 'lucide-react'

// Shared spinner. `size` is the icon size in px; `label` shows under it.
export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />
}

// Full-page centred loading state (auth check, route boot).
export default function PageLoader({ label = 'กำลังโหลด...' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4f6fb]" role="status" aria-live="polite">
      <Spinner size={32} className="text-blue-600" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  )
}
