import { uiAlert, uiConfirm, uiPrompt } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, KeyRound, Pencil, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import CopyButton from '../../components/CopyButton'
import SetPasswordModal from '../../components/SetPasswordModal'
import { Spinner } from '../../components/Spinner'
import { Badge, PageHeader, ui } from '../../components/ui'
import { listEmployees, deleteEmployee } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import { useAuth } from '../../auth/AuthProvider'
import { canManageLogin, isSuperAdmin, passwordState, PASSWORD_STATE, roleLabel, roleTone } from '../../shared/roles'
import type { PasswordState } from '../../shared/roles'
import type { AccessGroup, Company, UserProfile } from '../../types/schema'

const HEADERS = ['ชื่อ-นามสกุล', 'ชื่อผู้ใช้', 'รหัสผ่าน', 'ตำแหน่ง / แผนก', 'บริษัท', 'สิทธิ์', '']
const STATES: PasswordState[] = ['default', 'temporary', 'own']
// Dropdown value for 'people with no access group' — '' already means 'any'.
const NO_GROUP = '-'
// ui.input is w-full; a filter should take only the width it needs.
const FILTER_SELECT = ui.input.replace('w-full', 'w-auto min-w-[11rem]')
const CHECKBOX = 'h-4 w-4 cursor-pointer rounded accent-clay-600 disabled:cursor-not-allowed disabled:opacity-30'

// The default password is the username, so it can be shown; any other is hashed.
function PasswordCell({ p }: { p: UserProfile }) {
  const st = passwordState(p)
  const meta = PASSWORD_STATE[st]
  return (
    <div className="flex items-center gap-1.5" title={meta.hint}>
      {st === 'default'
        ? <><span className="font-mono text-[13px] text-stone-900">{p.employeeId}</span><CopyButton value={p.employeeId} label="คัดลอกรหัสผ่าน" /></>
        : <span className="font-mono tracking-widest text-stone-300">••••••</span>}
      <Badge tone={meta.tone}>{meta.label}</Badge>
    </div>
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
  const companyName = (id: string) => companies.find(c => c.id === id)?.name || id
  // Search the fields people actually look someone up by.
  const needle = q.trim().toLowerCase()
  // The department list is built from the people themselves, so it covers values
  // typed before they were ever added to Custom Field.
  const departments = [...new Set(rows.map(r => r.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'))
  const filtering = !!needle || !!dept || !!group
  const filtered = rows.filter(r =>
    (!needle || `${r.employeeId} ${r.firstName} ${r.lastName} ${r.position} ${r.department}`.toLowerCase().includes(needle))
    && (!dept || r.department === dept)
    && (!group || (group === NO_GROUP ? !r.accessGroup : r.accessGroup === group)))
  function clearFilters() { setQ(''); setDept(''); setGroup('') }
  const onDefault = rows.filter(r => passwordState(r) === 'default').length

  // "Select all" means everyone the search is showing, not everyone there is:
  // what is ticked should be what can be seen.
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
        subtitle={loading ? 'กำลังโหลด...' : `ทั้งหมด ${rows.length} คน · ยังใช้รหัสเริ่มต้น ${onDefault} คน`}
        actions={<>
          <Link to="/admin/import" className={ui.btnSecondary}><FileUp size={16} /> นำเข้าพนักงาน</Link>
          <Link to="/admin/employees/new" className={ui.btnPrimary}><UserPlus size={16} /> เพิ่มพนักงาน</Link>
        </>}
      />

      {/* Search, filters, and what the password badges mean */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ค้นหาชื่อผู้ใช้ / ชื่อ / ตำแหน่ง / แผนก"
            className={`${ui.input} pl-9`}
          />
        </div>
        <select aria-label="กรองตามแผนก" value={dept} onChange={e => setDept(e.target.value)} className={FILTER_SELECT}>
          <option value="">ทุกแผนก</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="กรองตามกลุ่มสิทธิ์" value={group} onChange={e => setGroup(e.target.value)} className={FILTER_SELECT}>
          <option value="">ทุกกลุ่มสิทธิ์</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          <option value={NO_GROUP}>ยังไม่ระบุกลุ่ม</option>
        </select>
        {filtering && (
          <button type="button" onClick={clearFilters} className={ui.btnGhost}><X size={16} /> ล้างตัวกรอง</button>
        )}
        <span className="text-xs text-stone-500">
          {filtering ? `แสดง ${filtered.length} จาก ${rows.length} คน` : `ทั้งหมด ${rows.length} คน`}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
        {STATES.map(s => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <Badge tone={PASSWORD_STATE[s].tone}>{PASSWORD_STATE[s].label}</Badge> {PASSWORD_STATE[s].short}
          </span>
        ))}
      </div>

      {picked.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-stone-900">เลือกแล้ว {picked.length} คน</span>
          {pickedHidden > 0 && <span className="text-stone-500">(ไม่อยู่ในผลค้นหาตอนนี้ {pickedHidden} คน)</span>}
          <button type="button" onClick={() => setSelected(new Set())} disabled={!!deleting} className={ui.btnGhost}>
            ยกเลิกการเลือก
          </button>
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

      <div className={ui.tableWrap}>
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
              {HEADERS.map(h => <th key={h} className={ui.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody className={ui.tbody}>
            {filtered.map(r => (
              <tr key={r.uid} className={`${ui.tr} ${selected.has(r.uid) ? 'bg-rose-50/50' : ''}`}>
                <td className={`${ui.td} w-10`}>
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
                <td className={`${ui.td} whitespace-nowrap`}>
                  <Link to={`/admin/employees/${r.uid}`} className="font-medium text-stone-900 hover:text-clay-600">
                    {r.firstName} {r.lastName}
                  </Link>
                </td>
                <td className={`${ui.td} whitespace-nowrap`}>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[13px] font-medium text-stone-900">{r.employeeId}</span>
                    <CopyButton value={r.employeeId} label="คัดลอกชื่อผู้ใช้" />
                  </div>
                </td>
                <td className={`${ui.td} whitespace-nowrap`}><PasswordCell p={r} /></td>
                <td className={ui.td}>
                  <div className="text-stone-700">{r.position || <span className="text-stone-300">—</span>}</div>
                  {r.department && <div className="text-xs text-stone-400">{r.department}</div>}
                </td>
                <td className={`${ui.td} max-w-[200px] truncate`} title={companyName(r.companyId)}>{companyName(r.companyId)}</td>
                <td className={`${ui.td} whitespace-nowrap`}><Badge tone={roleTone(r)}>{roleLabel(r)}</Badge></td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1.5">
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
            ))}
            {loading && (
              <tr><td colSpan={HEADERS.length + 1} className={ui.emptyCell}><Spinner size={20} className="mx-auto" /></td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length + 1} className={ui.emptyCell}>
                  {rows.length === 0 ? 'ยังไม่มีพนักงาน' : needle && !dept && !group ? `ไม่พบพนักงานที่ตรงกับ “${q}”` : 'ไม่พบพนักงานที่ตรงกับตัวกรอง'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pwFor && <SetPasswordModal profile={pwFor} onClose={() => setPwFor(null)} onDone={load} />}
    </div>
  )
}
