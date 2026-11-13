import { useState } from 'react'
import { Tag } from 'lucide-react'
import { setDocStatus } from '../data/submissions'
import { uiAlert } from './dialog/dialogService'
import type { SubmissionSummary } from '../types/schema'

// The admin's own note on a document, in the office's words — เอกสารผิด,
// ไม่ได้ใช้, whatever is on the list. The system does nothing with it: it
// marks the row, and that is all it is for. The words themselves come from
// Custom Field (field_options, field = 'docStatus'), so the list grows without
// a developer.
export default function DocStatusPicker({ sub, options, onChanged }: {
  sub: SubmissionSummary
  options: string[]
  onChanged: (status: string | null) => void
}) {
  const [saving, setSaving] = useState(false)
  const current = sub.docStatus ?? ''
  // A status set before its word was taken off the list still shows.
  const list = current && !options.includes(current) ? [current, ...options] : options

  async function change(value: string) {
    const next = value || null
    if (next === (sub.docStatus ?? null)) return
    setSaving(true)
    try {
      await setDocStatus(sub.id, next)
      onChanged(next)
    } catch (e) {
      uiAlert((e as Error).message, { title: 'ตั้งสถานะไม่สำเร็จ' })
    } finally { setSaving(false) }
  }

  return (
    <span className="relative inline-flex items-center">
      <Tag size={13} className={`pointer-events-none absolute left-2 ${current ? 'text-clay-600' : 'text-stone-400'}`} aria-hidden />
      <select
        value={current}
        disabled={saving}
        onChange={e => change(e.target.value)}
        aria-label={`สถานะที่ผู้ดูแลระบบตั้ง — ${sub.docNumber}`}
        title="สถานะที่ผู้ดูแลระบบตั้งเอง (ไม่มีผลกับการใช้งานเอกสาร)"
        className={`h-7 max-w-[9.5rem] truncate rounded-lg border py-0 pl-7 pr-2 text-xs transition-colors focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100 disabled:opacity-50 ${
          current ? 'border-clay-200 bg-clay-50 font-medium text-clay-700' : 'border-stone-200 bg-white text-stone-500'
        }`}
      >
        <option value="">— ไม่ได้ตั้ง —</option>
        {list.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    </span>
  )
}
