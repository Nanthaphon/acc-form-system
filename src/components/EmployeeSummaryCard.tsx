import type { ReactNode } from 'react'
import { Building2, Mail, Tags, Users } from 'lucide-react'
import type { AccessGroup, Company, UserProfile } from '../types/schema'
import { roleLabel, roleTone } from '../shared/roles'
import { initialsOf } from '../shared/initials'
import { Badge, ui } from './ui'

type Person = Pick<UserProfile, 'firstName' | 'lastName' | 'position' | 'employeeId' | 'role' | 'companyId' | 'department'>
  & Partial<Pick<UserProfile, 'isSuperAdmin' | 'accessGroup' | 'email' | 'nickname'>>

// The person being edited, at a glance, beside the form — and it follows what
// is typed, so the admin sees how the account will read before saving.
export default function EmployeeSummaryCard({ person, companies, groups, footer }: {
  person: Person
  companies: Company[]
  groups: AccessGroup[]
  footer?: ReactNode
}) {
  const name = `${person.firstName} ${person.lastName}`.trim()
  const initials = initialsOf(person.firstName, person.lastName) || '?'
  const company = companies.find(c => c.id === person.companyId)
  const group = groups.find(g => g.id === person.accessGroup)
  const rows: { icon: ReactNode; label: string; value?: string | null }[] = [
    { icon: <Building2 size={15} />, label: 'บริษัท', value: company?.shortName || company?.name },
    { icon: <Users size={15} />, label: 'แผนก', value: person.department },
    { icon: <Tags size={15} />, label: 'กลุ่มการเข้าถึง', value: group?.name },
    { icon: <Mail size={15} />, label: 'อีเมล', value: person.email },
  ]
  return (
    <div className={`${ui.card} lg:sticky lg:top-6`}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-clay-600 text-2xl font-semibold text-white shadow-[0_8px_20px_-8px_rgba(30,78,140,0.6)]">
          {initials}
        </span>
        <h2 className="mt-4 text-lg font-semibold text-stone-900">{name || 'ยังไม่ได้ใส่ชื่อ'}</h2>
        {person.nickname && <p className="text-sm text-stone-500">({person.nickname})</p>}
        <p className="text-sm text-stone-500">{person.position || 'ยังไม่ได้ใส่ตำแหน่ง'}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-mono text-xs text-stone-700">{person.employeeId || '—'}</span>
          <Badge tone={roleTone(person)}>{roleLabel(person)}</Badge>
        </div>
      </div>
      <dl className="mt-6 space-y-3 border-t border-stone-100 pt-5 text-sm">
        {rows.map(r => (
          <div key={r.label} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-stone-400">{r.icon}</span>
            <dt className="w-28 shrink-0 text-stone-500">{r.label}</dt>
            <dd className={`min-w-0 flex-1 break-words ${r.value ? 'text-stone-800' : 'text-stone-500'}`}>{r.value || '—'}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-5 border-t border-stone-100 pt-4">{footer}</div>}
    </div>
  )
}
