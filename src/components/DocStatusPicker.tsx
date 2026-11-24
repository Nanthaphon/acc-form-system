import { useState } from 'react'
import { Tag } from 'lucide-react'
import FilterSelect from './FilterSelect'
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
    <FilterSelect
      chip={{ unsetLabel: 'ตั้งป้าย', icon: <Tag size={12} className="shrink-0" /> }}
      className={saving ? 'pointer-events-none opacity-50' : ''}
      ariaLabel={`ป้ายสถานะ ${sub.docNumber}`}
      allLabel="— ไม่ได้ตั้ง —"
      searchable={false}
      value={current}
      options={list.map(v => ({ value: v, label: v }))}
      onChange={change}
    />
  )
}
