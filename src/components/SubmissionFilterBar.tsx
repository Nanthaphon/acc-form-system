import type { ReactNode } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import type { FormSettings, FormGroup, UserProfile, SubmissionStatus } from '../types/schema'
import { statusMeta } from '../data/submissions'
import type { Filters } from '../shared/submissionFilter'
import { emptyFilters, NO_DOC_STATUS } from '../shared/submissionFilter'
import DateInput from './DateInput'
import FilterSelect from './FilterSelect'
import type { FilterOption } from './FilterSelect'
import { folderIn, folderPath } from '../shared/folders'
import { ui } from './ui'

const STATUSES: SubmissionStatus[] = ['done', 'pending', 'signed', 'void']

interface Props {
  value: Filters
  onChange: (f: Filters) => void
  forms: FormSettings[]
  groups?: FormGroup[]        // when provided, show a folder filter
  formGroup?: (formType: string) => string | undefined   // a form's folder, as the page reckons it
  employees?: UserProfile[]   // when provided, show an employee filter
  docStatuses?: string[]      // when provided, show a filter on the admin's own status
  resultCount: number
  total?: number              // all there are, so a filtered count reads "12 จาก 110"
  extra?: ReactNode           // the page's own tools, at the end of the bar (the column picker)
}

export default function SubmissionFilterBar({ value, onChange, forms, groups, formGroup, employees, docStatuses, resultCount, total, extra }: Props) {
  const cls = ui.inputSm
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch })
  // A folder picked narrows the forms to its own. The forms are listed under
  // their folder's name, so two of the same name in different folders are told
  // apart by where they sit.
  const folderOf = (f: FormSettings) => formGroup?.(f.formType) ?? f.groupId
  const within = (f: FormSettings, folder: string) => (groups ? folderIn(groups, folderOf(f), folder) : folderOf(f) === folder)
  const formChoices = value.groupId ? forms.filter(f => within(f, value.groupId)) : forms
  const nameOf = (f: FormSettings) => f.name || f.title
  const folderName = (id?: string) => (groups ? folderPath(groups, id) : '') || undefined
  const folderRank = (f: FormSettings) => groups?.findIndex(g => g.id === folderOf(f)) ?? -1
  const formOptions: FilterOption[] = [...formChoices]
    .sort((a, b) => folderRank(a) - folderRank(b))
    .map(f => ({ value: f.formType, label: nameOf(f), group: folderName(folderOf(f)) }))
  const folderOptions: FilterOption[] = (groups ?? []).map(g => ({
    value: g.id, label: g.name, indent: !!g.parentId && !!groups?.some(p => p.id === g.parentId),
  }))
  const statusOptions: FilterOption[] = STATUSES.map(st => ({ value: st, label: statusMeta(st).label }))
  const docStatusOptions: FilterOption[] = [...(docStatuses ?? []).map(v => ({ value: v, label: v })), { value: NO_DOC_STATUS, label: 'ยังไม่ได้ตั้ง' }]
  const employeeOptions: FilterOption[] = (employees ?? []).map(p => ({ value: p.employeeId, label: `${p.firstName} ${p.lastName} · ${p.employeeId}` }))
  const dateOptions: FilterOption[] = [
    { value: 'today', label: 'วันนี้' },
    { value: 'thisMonth', label: 'เดือนนี้' },
    { value: 'lastMonth', label: 'เดือนที่แล้ว' },
    { value: 'thisYear', label: 'ปีนี้' },
    { value: 'custom', label: 'กำหนดเอง…' },
  ]
  // Nothing to clear while nothing is picked.
  const filtering = (Object.keys(emptyFilters) as (keyof Filters)[]).some(k => value[k] !== emptyFilters[k])
  const pickFolder = (groupId: string) => {
    const keepForm = !value.formType || !groupId || forms.some(f => f.formType === value.formType && within(f, groupId))
    set({ groupId, ...(keepForm ? {} : { formType: '' }) })
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          className={`${cls} w-56 pl-8`}
          placeholder="ค้นหา เลขที่ / ชื่อฟอร์ม"
          value={value.q}
          onChange={e => set({ q: e.target.value })}
        />
      </div>
      {groups && groups.length > 0 && (
        <FilterSelect className="w-44" ariaLabel="โฟลเดอร์" allLabel="ทุกโฟลเดอร์" options={folderOptions} value={value.groupId} onChange={pickFolder} />
      )}
      <FilterSelect className="w-60" ariaLabel="ฟอร์ม" allLabel="ฟอร์มทั้งหมด" options={formOptions} value={value.formType} onChange={v => set({ formType: v })} />
      <FilterSelect className="w-40" ariaLabel="สถานะ" allLabel="สถานะทั้งหมด" options={statusOptions} value={value.status} onChange={v => set({ status: v })} />
      {docStatuses && (
        <FilterSelect className="w-44" ariaLabel="สถานะเอกสาร" allLabel="ป้ายทั้งหมด" options={docStatusOptions} value={value.docStatus} onChange={v => set({ docStatus: v })} />
      )}
      {employees && (
        <FilterSelect className="w-56" ariaLabel="พนักงาน" allLabel="พนักงานทั้งหมด" options={employeeOptions} searchable value={value.emp} onChange={v => set({ emp: v })} />
      )}
      {/* 'all' is how an unset date range is kept */}
      <FilterSelect className="w-36" ariaLabel="ช่วงวันที่" allLabel="ทุกวันที่" options={dateOptions}
        value={value.datePreset === 'all' ? '' : value.datePreset} onChange={v => set({ datePreset: v || 'all' })} />
      {value.datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <DateInput className={`${cls} w-36`} value={value.fromD} onChange={v => set({ fromD: v })} />
          <span className="text-sm text-stone-400">ถึง</span>
          <DateInput className={`${cls} w-36`} value={value.toD} onChange={v => set({ toD: v })} />
        </div>
      )}
      {filtering && (
        <button type="button" onClick={() => onChange(emptyFilters)} className={ui.btnGhost}>
          <RotateCcw size={15} /> ล้างตัวกรอง
        </button>
      )}
      <div className="ml-auto flex items-center gap-3">
        <span className="whitespace-nowrap text-sm text-stone-500">
          <span className="font-medium text-stone-900">{resultCount}</span>
          {total !== undefined && total !== resultCount && <> จาก {total}</>} รายการ
        </span>
        {extra}
      </div>
    </div>
  )
}
