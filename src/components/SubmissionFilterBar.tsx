import { RotateCcw, Search } from 'lucide-react'
import type { FormSettings, FormGroup, UserProfile, SubmissionStatus } from '../types/schema'
import { statusMeta } from '../data/submissions'
import type { Filters } from '../shared/submissionFilter'
import { emptyFilters } from '../shared/submissionFilter'
import DateInput from './DateInput'
import { ui } from './ui'

const STATUSES: SubmissionStatus[] = ['done', 'pending', 'signed']
const cls = ui.inputSm

interface Props {
  value: Filters
  onChange: (f: Filters) => void
  forms: FormSettings[]
  groups?: FormGroup[]        // when provided, show a folder filter
  employees?: UserProfile[]   // when provided, show an employee filter
  resultCount: number
}

export default function SubmissionFilterBar({ value, onChange, forms, groups, employees, resultCount }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className={`${cls} w-56 pl-8`}
          placeholder="ค้นหา เลขที่ / ชื่อฟอร์ม"
          value={value.q}
          onChange={e => set({ q: e.target.value })}
        />
      </div>
      {groups && groups.length > 0 && (
        <select className={cls} value={value.groupId} onChange={e => set({ groupId: e.target.value })}>
          <option value="">— ทุกโฟลเดอร์ —</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      )}
      <select className={cls} value={value.formType} onChange={e => set({ formType: e.target.value })}>
        <option value="">— ฟอร์มทั้งหมด —</option>
        {forms.map(f => <option key={f.formType} value={f.formType}>{f.name || f.title}</option>)}
      </select>
      <select className={cls} value={value.status} onChange={e => set({ status: e.target.value })}>
        <option value="">— สถานะทั้งหมด —</option>
        {STATUSES.map(s => <option key={s} value={s}>{statusMeta(s).label}</option>)}
      </select>
      {employees && (
        <select className={cls} value={value.emp} onChange={e => set({ emp: e.target.value })}>
          <option value="">— พนักงานทั้งหมด —</option>
          {employees.map(p => (
            <option key={p.uid} value={p.employeeId}>{p.employeeId} — {p.firstName} {p.lastName}</option>
          ))}
        </select>
      )}
      <select className={cls} value={value.datePreset} onChange={e => set({ datePreset: e.target.value })}>
        <option value="all">— ทุกวันที่ —</option>
        <option value="today">วันนี้</option>
        <option value="thisMonth">เดือนนี้</option>
        <option value="lastMonth">เดือนที่แล้ว</option>
        <option value="thisYear">ปีนี้</option>
        <option value="custom">กำหนดเอง…</option>
      </select>
      {value.datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <DateInput className={`${cls} w-36`} value={value.fromD} onChange={v => set({ fromD: v })} />
          <span className="text-sm text-gray-400">ถึง</span>
          <DateInput className={`${cls} w-36`} value={value.toD} onChange={v => set({ toD: v })} />
        </div>
      )}
      <button type="button" onClick={() => onChange(emptyFilters)} className={ui.btnGhost}>
        <RotateCcw size={15} /> ล้างตัวกรอง
      </button>
      <span className="ml-auto whitespace-nowrap text-sm text-gray-500">
        <span className="font-medium text-gray-900">{resultCount}</span> รายการ
      </span>
    </div>
  )
}
