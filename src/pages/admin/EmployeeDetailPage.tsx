import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileText, Pencil, Printer, Trash2, UserRound } from 'lucide-react'
import { getProfileByUid } from '../../data/users'
import { listMySubmissions, submissionAmount, deleteSubmission } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import type { UserProfile, SubmissionSummary, FormSettings, Company, AccessGroup, FormGroup } from '../../types/schema'
import { formatDate, formatDateTime } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import ActionIconButton from '../../components/ActionIconButton'
import { Spinner } from '../../components/Spinner'
import { Badge, PageHeader, ui } from '../../components/ui'

const HEADERS = [
  { label: 'เลขที่', cls: '' },
  { label: 'ฟอร์ม', cls: '' },
  { label: 'วันที่', cls: '' },
  { label: 'ยอด', cls: 'text-right' },
  { label: 'พิมพ์ (ครั้ง)', cls: 'text-center' },
  { label: 'พิมพ์ล่าสุด', cls: '' },
  { label: 'แก้ไข', cls: '' },
  { label: '', cls: '' },
]

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-xs font-medium text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value || '-'}</div>
    </div>
  )
}

export default function EmployeeDetailPage() {
  const { uid } = useParams()
  const nav = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subs, setSubs] = useState<SubmissionSummary[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [folders, setFolders] = useState<FormGroup[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)

  function loadSubs() { if (uid) listMySubmissions(uid).then(setSubs) }
  useEffect(() => {
    if (!uid) return
    getProfileByUid(uid).then(setProfile)
    loadSubs()
    getVersionCounts().then(setVcounts)
    listForms().then(setForms)
    listCompanies().then(setCompanies)
    listAccessGroups().then(setGroups)
    listGroups().then(setFolders)
  }, [uid])

  async function onDeleteSub(r: SubmissionSummary) {
    if (!(await uiConfirm(`ลบถาวร ยกเลิกไม่ได้`, { title: `ลบเอกสาร "${r.docNumber || 'ไม่มีเลขที่'}" ?`, tone: 'danger', confirmText: 'ลบ' }))) return
    try { await deleteSubmission(r.id); loadSubs() }
    catch { uiAlert('ลบเอกสารไม่สำเร็จ') }
  }

  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }
  const companyName = (id: string) => companies.find(c => c.id === id)?.name || id
  const accessGroupName = (id?: string) => id ? (groups.find(a => a.id === id)?.name || id) : ''

  if (!profile) return (
    <div className="flex items-center gap-2 p-4 text-sm text-gray-500"><Spinner size={16} /> กำลังโหลด...</div>
  )

  const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId ?? folders[0]?.id
  const filtered = applyFilters(subs, filters, { formGroup, formName })

  return (
    <div>
      <PageHeader
        icon={<UserRound size={20} />}
        title="ข้อมูลพนักงาน"
        subtitle={`${profile.firstName} ${profile.lastName} · รหัส ${profile.employeeId}`}
        onBack={() => nav('/admin/employees')}
        actions={
          <Link to={`/admin/employees/${profile.uid}/edit`} className={ui.btnPrimary}>
            <Pencil size={16} /> แก้ไขข้อมูล
          </Link>
        }
      />

      <div className="space-y-6">
        <div className={ui.card}>
          <div className="grid grid-cols-2 gap-5 text-sm md:grid-cols-3">
            <Info label="รหัสพนักงาน" value={profile.employeeId} />
            <Info label="ชื่อ-นามสกุล" value={`${profile.firstName} ${profile.lastName}`} />
            <Info label="ตำแหน่ง" value={profile.position} />
            <Info label="แผนก" value={profile.department} />
            <Info label="บริษัท" value={companyName(profile.companyId)} />
            <Info label="กลุ่ม (Access group)" value={accessGroupName(profile.accessGroup)} />
            <Info label="สิทธิ์" value={profile.role} />
          </div>
        </div>

        <div>
          <h2 className={`${ui.cardTitle} mb-3 flex items-center gap-2`}>
            <FileText size={16} className="text-gray-400" /> เอกสารที่พิมพ์ ({subs.length})
          </h2>
          <div className="mb-4">
            <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={folders} resultCount={filtered.length} />
          </div>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>{HEADERS.map(h => <th key={h.label} className={`${ui.th} ${h.cls}`}>{h.label}</th>)}</tr>
              </thead>
              <tbody className={ui.tbody}>
                {filtered.map(r => (
                  <tr key={r.id} className={ui.tr}>
                    <td className={`${ui.td} whitespace-nowrap font-mono text-[13px]`}>{r.docNumber}</td>
                    <td className={`${ui.td} font-medium text-gray-900`}>{formName(r.formType)}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                    <td className={`${ui.td} whitespace-nowrap text-right tabular-nums`}>{submissionAmount(r).toLocaleString()}</td>
                    <td className={`${ui.td} text-center tabular-nums`}>{r.printCount}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>{formatDateTime(r.lastPrintedAt)}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>
                      {editLabel(r, vcounts)
                        ? <Badge tone="amber">✎ {editLabel(r, vcounts)}</Badge>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <ActionIconButton label="แก้ไข" to={`/submission/${r.id}`} icon={<Pencil size={16} />} />
                        <ActionIconButton label="พิมพ์" to={`/submission/${r.id}/preview`} tone="green" icon={<Printer size={16} />} />
                        <ActionIconButton label="ลบ" onClick={() => onDeleteSub(r)} tone="red" icon={<Trash2 size={16} />} />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={HEADERS.length} className={ui.emptyCell}>
                      {subs.length === 0 ? 'ยังไม่มีเอกสาร' : 'ไม่พบเอกสารที่ตรงกับตัวกรอง'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
