import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, KeyRound, Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import CopyButton from '../../components/CopyButton'
import SetPasswordModal from '../../components/SetPasswordModal'
import { Spinner } from '../../components/Spinner'
import { Badge, PageHeader, ui } from '../../components/ui'
import { listEmployees, deleteEmployee } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { useAuth } from '../../auth/AuthProvider'
import { isSuperAdmin, passwordState, PASSWORD_STATE, roleLabel, roleTone } from '../../shared/roles'
import type { PasswordState } from '../../shared/roles'
import type { Company, UserProfile } from '../../types/schema'

const HEADERS = ['ชื่อ-นามสกุล', 'ชื่อผู้ใช้', 'รหัสผ่าน', 'ตำแหน่ง / แผนก', 'บริษัท', 'สิทธิ์', '']
const STATES: PasswordState[] = ['default', 'temporary', 'own']

// The default password is the username, so it can be shown; any other is hashed.
function PasswordCell({ p }: { p: UserProfile }) {
  const st = passwordState(p)
  const meta = PASSWORD_STATE[st]
  return (
    <div className="flex items-center gap-1.5" title={meta.hint}>
      {st === 'default'
        ? <><span className="font-mono text-[13px] text-gray-900">{p.employeeId}</span><CopyButton value={p.employeeId} label="คัดลอกรหัสผ่าน" /></>
        : <span className="font-mono tracking-widest text-gray-300">••••••</span>}
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
  const [pwFor, setPwFor] = useState<UserProfile | null>(null)

  function load() { listEmployees().then(r => { setRows(r); setLoading(false) }) }
  useEffect(() => { load(); listCompanies().then(setCompanies) }, [])

  const viewerIsSuper = isSuperAdmin(profile)
  // Only the Super Admin may edit the Super Admin's account.
  const locked = (r: UserProfile) => isSuperAdmin(r) && !viewerIsSuper
  const companyName = (id: string) => companies.find(c => c.id === id)?.name || id
  // Search the fields people actually look someone up by.
  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? rows.filter(r => `${r.employeeId} ${r.firstName} ${r.lastName} ${r.position} ${r.department}`.toLowerCase().includes(needle))
    : rows
  const onDefault = rows.filter(r => passwordState(r) === 'default').length

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
        title="พนักงาน"
        subtitle={loading ? 'กำลังโหลด...' : `ทั้งหมด ${rows.length} คน · ยังใช้รหัสเริ่มต้น ${onDefault} คน`}
        actions={<>
          <Link to="/admin/import" className={ui.btnSecondary}><FileUp size={16} /> Import CSV</Link>
          <Link to="/admin/employees/new" className={ui.btnPrimary}><UserPlus size={16} /> เพิ่มพนักงาน</Link>
        </>}
      />

      {/* Search + what the password badges mean */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ค้นหาชื่อผู้ใช้ / ชื่อ / ตำแหน่ง / แผนก"
            className={`${ui.input} pl-9`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          {STATES.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <Badge tone={PASSWORD_STATE[s].tone}>{PASSWORD_STATE[s].label}</Badge> {PASSWORD_STATE[s].short}
            </span>
          ))}
        </div>
      </div>

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead className={ui.thead}>
            <tr>{HEADERS.map(h => <th key={h} className={ui.th}>{h}</th>)}</tr>
          </thead>
          <tbody className={ui.tbody}>
            {filtered.map(r => (
              <tr key={r.uid} className={ui.tr}>
                <td className={`${ui.td} whitespace-nowrap`}>
                  <Link to={`/admin/employees/${r.uid}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {r.firstName} {r.lastName}
                  </Link>
                </td>
                <td className={`${ui.td} whitespace-nowrap`}>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[13px] font-medium text-gray-900">{r.employeeId}</span>
                    <CopyButton value={r.employeeId} label="คัดลอกชื่อผู้ใช้" />
                  </div>
                </td>
                <td className={`${ui.td} whitespace-nowrap`}><PasswordCell p={r} /></td>
                <td className={ui.td}>
                  <div className="text-gray-700">{r.position || <span className="text-gray-300">—</span>}</div>
                  {r.department && <div className="text-xs text-gray-400">{r.department}</div>}
                </td>
                <td className={`${ui.td} max-w-[200px] truncate`} title={companyName(r.companyId)}>{companyName(r.companyId)}</td>
                <td className={`${ui.td} whitespace-nowrap`}><Badge tone={roleTone(r)}>{roleLabel(r)}</Badge></td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    {viewerIsSuper && r.uid !== profile?.uid && (
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
              <tr><td colSpan={HEADERS.length} className={ui.emptyCell}><Spinner size={20} className="mx-auto" /></td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} className={ui.emptyCell}>
                  {rows.length === 0 ? 'ยังไม่มีพนักงาน' : `ไม่พบพนักงานที่ตรงกับ “${q}”`}
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
