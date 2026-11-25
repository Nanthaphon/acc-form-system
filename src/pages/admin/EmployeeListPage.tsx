import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import EmptyRow from '../../components/EmptyRow'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileDown, FileUp, KeyRound, Pencil, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import CopyButton from '../../components/CopyButton'
import SetPasswordModal from '../../components/SetPasswordModal'
import ColumnPicker from '../../components/ColumnPicker'
import FilterSelect from '../../components/FilterSelect'
import type { PickableColumn } from '../../components/ColumnPicker'
import { useHiddenColumns } from '../../shared/useHiddenColumns'
import { AVATAR_TONE, initialOf } from '../../shared/initials'
import { employeesCsvName, employeesToCsv } from '../../shared/employeeCsv'
import { saveFile } from '../../shared/saveFile'
import { Spinner } from '../../components/Spinner'
import { Badge, PageHeader, ui } from '../../components/ui'
import { listEmployees, deleteEmployee } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { useAuth } from '../../auth/AuthProvider'
import { canManageLogin, isSuperAdmin, roleLabel, roleTone } from '../../shared/roles'
import type { ReactNode } from 'react'
import type { AccessGroup, Company, UserProfile } from '../../types/schema'

// The columns a viewer can show or hide (ColumnPicker). The name always shows.
const COLUMNS: PickableColumn[] = [
  { key: 'name', label: 'พนักงาน', locked: true },
  { key: 'nickname', label: 'ชื่อเล่น' },
  { key: 'employeeId', label: 'ชื่อผู้ใช้' },
  { key: 'position', label: 'ตำแหน่ง' },
  { key: 'department', label: 'แผนก' },
  { key: 'company', label: 'บริษัท' },
  { key: 'email', label: 'อีเมล' },
  { key: 'group', label: 'กลุ่มการเข้าถึง' },
  { key: 'role', label: 'สิทธิ์' },
]
// Off until turned on: the rest is what people look someone up by.
const HIDDEN_AT_FIRST = ['email', 'group']
const muted = (v: ReactNode) => v || <span className="text-stone-300">—</span>
// Dropdown value for 'people with no access group' — '' already means 'any'.
const NO_GROUP = '-'

const CHECKBOX = 'h-4 w-4 cursor-pointer rounded accent-clay-600 disabled:cursor-not-allowed disabled:opacity-30'
const initial = (p: UserProfile) => initialOf(p.nickname || p.firstName || p.employeeId) || '?'

// Placeholder rows while the list loads, the same shape as the real ones.
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-stone-100" /></td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-stone-100" />
              <div className="space-y-1.5"><div className="h-3 w-36 rounded bg-stone-100" /><div className="h-2.5 w-16 rounded bg-stone-100" /></div>
            </div>
          </td>
          {Array.from({ length: cols - 1 }, (_, j) => <td key={j} className="px-4 py-3"><div className="h-3 w-24 rounded bg-stone-100" /></td>)}
          <td className="px-4 py-3" />
        </tr>
      ))}
    </>
  )
}

export default function EmployeeListPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<UserProfile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [group, setGroup] = useState('')
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [pwFor, setPwFor] = useState<UserProfile | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<{ done: number; total: number } | null>(null)
  const cols = useHiddenColumns('cols:employees', HIDDEN_AT_FIRST)
  const shown = COLUMNS.filter(c => c.locked || !cols.hidden.has(c.key))

  function load() {
    listEmployees().then(r => {
      setRows(r); setLoading(false)
      // Someone deleted, or removed elsewhere, cannot stay ticked.
      const present = new Set(r.map(p => p.uid))
      setSelected(prev => new Set([...prev].filter(uid => present.has(uid))))
    })
  }
  useEffect(() => { load(); listCompanies().then(setCompanies); listAccessGroups().then(setGroups) }, [])

  const viewerIsSuper = isSuperAdmin(profile)
  // The same rule as the row's delete button, which the database enforces too.
  const deletable = (r: UserProfile) => r.uid !== profile?.uid && !isSuperAdmin(r)
  // Only the Super Admin may edit the Super Admin's account.
  const locked = (r: UserProfile) => isSuperAdmin(r) && !viewerIsSuper
  const company = (id: string) => companies.find(c => c.id === id)
  const needle = q.trim().toLowerCase()
  // Built from the people themselves, so it covers values typed before they
  // were ever added to Custom Field.
  const departments = [...new Set(rows.map(r => r.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'))
  const filtering = !!needle || !!dept || !!group
  const filtered = rows.filter(r =>
    (!needle || `${r.employeeId} ${r.firstName} ${r.lastName} ${r.nickname ?? ''} ${r.position} ${r.department}`.toLowerCase().includes(needle))
    && (!dept || r.department === dept)
    && (!group || (group === NO_GROUP ? !r.accessGroup : r.accessGroup === group)))
  function clearFilters() { setQ(''); setDept(''); setGroup('') }

  // "Select all" means everyone the search is showing: what is ticked should be what can be seen.
  const visible = filtered.filter(deletable)
  const allTicked = visible.length > 0 && visible.every(r => selected.has(r.uid))
  const someTicked = visible.some(r => selected.has(r.uid))
  const picked = rows.filter(r => selected.has(r.uid) && deletable(r))
  const pickedHidden = picked.filter(r => !filtered.includes(r)).length

  function toggle(uid: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }
  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      for (const r of visible) {
        if (allTicked) next.delete(r.uid)
        else next.add(r.uid)
      }
      return next
    })
  }

  async function onDeleteSelected() {
    const n = picked.length
    const names = picked.slice(0, 8).map(r => `• ${r.firstName} ${r.lastName} (${r.employeeId})`).join('\n')
    const more = n > 8 ? `\nและอีก ${n - 8} คน` : ''
    // Typing the number rather than clicking OK: this removes logins and every
    // document these people ever made, and cannot be undone.
    const typed = await uiPrompt(
      `ลบบัญชี login และเอกสารทั้งหมดของทุกคนต่อไปนี้อย่างถาวร ย้อนกลับไม่ได้\n\n${names}${more}\n\nพิมพ์ ${n} เพื่อยืนยัน`,
      { title: `ลบพนักงาน ${n} คน ?`, tone: 'danger', confirmText: 'ลบ', placeholder: String(n) },
    )
    if (typed === null) return
    if (typed.trim() !== String(n)) { uiAlert(`ตัวเลขไม่ตรงกับ ${n} — ยังไม่ได้ลบใคร`); return }

    const failed: string[] = []
    for (const [i, r] of picked.entries()) {
      setDeleting({ done: i, total: n })
      try { await deleteEmployee(r.uid) }
      catch (err: any) { failed.push(`• ${r.firstName} ${r.lastName} (${r.employeeId}) — ${err?.message || 'เกิดข้อผิดพลาด'}`) }
    }
    setDeleting(null)
    load()
    if (failed.length === 0) uiAlert(`ลบพนักงานแล้ว ${n} คน`, { tone: 'success' })
    else uiAlert(`ลบแล้ว ${n - failed.length} คน · ไม่สำเร็จ ${failed.length} คน\n\n${failed.join('\n')}`, { title: 'ลบไม่ครบทุกคน', tone: 'danger' })
  }

  // The people the search and filters are showing, every column, as a CSV file.
  function exportCsv() {
    saveFile(new TextEncoder().encode(employeesToCsv(filtered, companies, groups)), employeesCsvName(), 'text/csv;charset=utf-8')
  }

  // One table cell per column key (COLUMNS).
  function cell(key: string, r: UserProfile): ReactNode {
    const td = 'px-4 py-3'
    switch (key) {
      case 'name': return (
        <td key={key} className={td}>
          <div className="flex items-center gap-3">
            <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${AVATAR_TONE}`}>
              {initial(r)}
            </span>
            <Link to={`/admin/employees/${r.uid}`} className="whitespace-nowrap font-medium text-stone-900 transition-colors hover:text-clay-600">
              {r.firstName} {r.lastName}
            </Link>
            {r.centralStatus === 'resigned' && <Badge tone="amber">ลาออกแล้ว</Badge>}
          </div>
        </td>
      )
      case 'nickname': return <td key={key} className={`${td} whitespace-nowrap text-stone-800`}>{muted(r.nickname)}</td>
      case 'employeeId': return (
        <td key={key} className={`${td} whitespace-nowrap`}>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[13px] font-medium text-stone-800">{r.employeeId}</span>
            <CopyButton value={r.employeeId} label="คัดลอกชื่อผู้ใช้" />
          </div>
        </td>
      )
      case 'position': return <td key={key} className={`${td} text-stone-800`}>{muted(r.position)}</td>
      case 'department': return <td key={key} className={`${td} text-stone-700`}>{muted(r.department)}</td>
      case 'company': {
        const c = company(r.companyId)
        return <td key={key} className={`${td} max-w-[180px] truncate text-stone-700`} title={c?.name || r.companyId}>{muted(c?.shortName || c?.name || r.companyId)}</td>
      }
      case 'email': return <td key={key} className={`${td} whitespace-nowrap text-stone-700`}>{muted(r.email)}</td>
      case 'group': return <td key={key} className={`${td} whitespace-nowrap text-stone-700`}>{muted(groups.find(g => g.id === r.accessGroup)?.name)}</td>
      case 'role': return <td key={key} className={`${td} whitespace-nowrap`}><Badge tone={roleTone(r)}>{roleLabel(r)}</Badge></td>
      default: return null
    }
  }

  async function onDelete(r: UserProfile) {
    if (!(await uiConfirm(`จะลบบัญชี login และประวัติทั้งหมดของคนนี้อย่างถาวร`, { title: `ลบพนักงาน "${r.firstName} ${r.lastName}" (${r.employeeId}) ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try {
      await deleteEmployee(r.uid)
      load()
    } catch (err: any) {
      uiAlert('ลบไม่สำเร็จ: ' + (err?.message || 'เกิดข้อผิดพลาด'))
    }
  }

  return (
    <div>
      <PageHeader
        icon={<Users size={20} />}
        title="ข้อมูลพนักงาน"
        actions={<>
          <button type="button" onClick={exportCsv} disabled={loading || filtered.length === 0} className={ui.btnSecondary}><FileDown size={16} /> ส่งออก CSV</button>
          <Link to="/admin/import" className={ui.btnSecondary}><FileUp size={16} /> นำเข้า</Link>
          <Link to="/admin/employees/new" className={ui.btnPrimary}><UserPlus size={16} /> เพิ่มพนักงาน</Link>
        </>}
      />

      {/* Search and filters — the same bar, controls and sizes as the history pages (SubmissionFilterBar) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ ชื่อเล่น รหัส" className={`${ui.inputSm} w-56 pl-8`} />
        </div>
        <FilterSelect className="w-52" ariaLabel="กรองตามแผนก" allLabel="ทุกแผนก" value={dept} onChange={setDept}
          options={departments.map(d => ({ value: d, label: d }))} />
        <FilterSelect className="w-48" ariaLabel="กรองตามกลุ่มสิทธิ์" allLabel="ทุกกลุ่มสิทธิ์" value={group} onChange={setGroup}
          options={[...groups.map(g => ({ value: g.id, label: g.name })), { value: NO_GROUP, label: 'ยังไม่ระบุกลุ่ม' }]} />
        {filtering && <button type="button" onClick={clearFilters} className={ui.btnGhost}><X size={16} /> ล้างตัวกรอง</button>}
        <div className="ml-auto flex items-center gap-3">
          <span className="whitespace-nowrap text-sm text-stone-500">
            {filtering
              ? <>แสดง <span className="font-medium text-stone-900">{filtered.length}</span> จาก {rows.length} คน</>
              : <><span className="font-medium text-stone-900">{rows.length}</span> คน</>}
          </span>
          <ColumnPicker columns={COLUMNS} hidden={cols.hidden} onToggle={cols.toggle} onReset={cols.reset} />
        </div>
      </div>

      <div className={ui.tableCard}>

        {/* What is ticked, and deleting it */}
        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${picked.length > 0 ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            {picked.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-rose-100 bg-rose-50/70 px-4 py-2.5 text-sm">
                <span className="font-medium text-stone-900">เลือกแล้ว {picked.length} คน</span>
                {pickedHidden > 0 && <span className="text-stone-500">(ไม่อยู่ในผลค้นหาตอนนี้ {pickedHidden} คน)</span>}
                <button type="button" onClick={() => setSelected(new Set())} disabled={!!deleting} className={ui.btnGhost}>ยกเลิกการเลือก</button>
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  disabled={!!deleting}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-brick-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brick-700 disabled:opacity-60"
                >
                  {deleting
                    ? <><Spinner size={16} /> กำลังลบ {deleting.done + 1}/{deleting.total}</>
                    : <><Trash2 size={16} /> ลบ {picked.length} คน</>}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={ui.tableScroll}>
          <table className={ui.table}>
            <thead className={ui.thead}>
              <tr>
                <th className={`${ui.th} w-10`}>
                  <input
                    type="checkbox"
                    aria-label="เลือกทั้งหมด"
                    className={CHECKBOX}
                    checked={allTicked}
                    disabled={visible.length === 0 || !!deleting}
                    ref={el => { if (el) el.indeterminate = someTicked && !allTicked }}
                    onChange={toggleAll}
                  />
                </th>
                {shown.map(c => <th key={c.key} className={ui.th}>{c.label}</th>)}
                <th className={ui.th}><span className="sr-only">จัดการ</span></th>
              </tr>
            </thead>
            <tbody className={ui.tbody}>
              {loading && <SkeletonRows cols={shown.length + 1} />}
              {!loading && filtered.map(r => {
                return (
                  <tr key={r.uid} className={`group transition-colors duration-150 ${selected.has(r.uid) ? 'bg-rose-50/50' : 'hover:bg-stone-50/70'}`}>
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`เลือก ${r.firstName} ${r.lastName}`}
                        className={CHECKBOX}
                        checked={selected.has(r.uid) && deletable(r)}
                        disabled={!deletable(r) || !!deleting}
                        title={deletable(r) ? undefined : r.uid === profile?.uid ? 'ลบบัญชีของตัวเองไม่ได้' : 'ลบบัญชี Super Admin ไม่ได้'}
                        onChange={() => toggle(r.uid)}
                      />
                    </td>
                    {shown.map(c => cell(c.key, r))}
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {canManageLogin(profile, r) && r.uid !== profile?.uid && (
                          <ActionIconButton label="ตั้งรหัสผ่านใหม่" icon={<KeyRound size={16} />} onClick={() => setPwFor(r)} />
                        )}
                        {!locked(r) && (
                          <ActionIconButton label="แก้ไข" to={`/admin/employees/${r.uid}/edit`} icon={<Pencil size={16} />} />
                        )}
                        {r.uid !== profile?.uid && !isSuperAdmin(r) && (
                          <ActionIconButton label="ลบพนักงาน" tone="red" icon={<Trash2 size={16} />} onClick={() => onDelete(r)} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && filtered.length === 0 && (
                <EmptyRow colSpan={shown.length + 2} icon={<Users size={20} />}>

                  {rows.length === 0 ? 'ยังไม่มีพนักงาน' : needle && !dept && !group ? `ไม่พบพนักงานที่ตรงกับ “${q}”` : 'ไม่พบพนักงานที่ตรงกับตัวกรอง'}

                </EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pwFor && <SetPasswordModal profile={pwFor} onClose={() => setPwFor(null)} onDone={load} />}
    </div>
  )
}
