import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileText, Pencil, PenLine, Printer, Trash2, UserRound } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { getProfileByUid } from '../../data/users'
import { listMySubmissions, submissionAmount, deleteSubmission, isSigned } from '../../data/submissions'
import { getVersionCounts, editLabel } from '../../data/versions'
import { listForms } from '../../data/formSettings'
import { listGroups } from '../../data/formGroups'
import { listCompanies } from '../../data/companies'
import { listAccessGroups } from '../../data/accessGroups'
import type { UserProfile, SubmissionSummary, FormSettings, Company, AccessGroup, FormGroup } from '../../types/schema'
import { formatDate, formatDateTime } from '../../shared/date'
import type { Filters } from '../../shared/submissionFilter'
import { emptyFilters, applyFilters } from '../../shared/submissionFilter'
import { canManageLogin, isSuperAdmin } from '../../shared/roles'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import { ActionGroup, ActionGroupItem, RowMenu } from '../../components/RowActions'
import EmployeeSummaryCard from '../../components/EmployeeSummaryCard'
import StatusBadge from '../../components/StatusBadge'
import LoginInfo from '../../components/LoginInfo'
import SignatureField from '../../components/SignatureField'
import SetPasswordModal from '../../components/SetPasswordModal'
import ChangeUsernameModal from '../../components/ChangeUsernameModal'
import { Spinner } from '../../components/Spinner'
import { PageHeader, ui } from '../../components/ui'
import DocNumberCell from '../../components/DocNumberCell'
import { formatMoney } from '../../shared/money'

const HEADERS = [
  { label: 'เลขที่', cls: '' },
  { label: 'ฟอร์ม', cls: '' },
  { label: 'วันที่', cls: '' },
  { label: 'ยอด', cls: 'text-right' },
  { label: 'สถานะ', cls: '' },
  { label: 'พิมพ์ล่าสุด', cls: '' },
  { label: '', cls: '' },
]

export default function EmployeeDetailPage() {
  const { uid } = useParams()
  const nav = useNavigate()
  const { profile: me, refresh } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subs, setSubs] = useState<SubmissionSummary[]>([])
  const [forms, setForms] = useState<FormSettings[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<AccessGroup[]>([])
  const [folders, setFolders] = useState<FormGroup[]>([])
  const [vcounts, setVcounts] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [settingPassword, setSettingPassword] = useState(false)
  const [changingUsername, setChangingUsername] = useState(false)

  function loadProfile() { if (uid) getProfileByUid(uid).then(setProfile) }
  function loadSubs() { if (uid) listMySubmissions(uid).then(setSubs) }
  useEffect(() => {
    if (!uid) return
    loadProfile()
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
  function afterUsernameChange() {
    loadProfile()
    loadSubs()
    if (uid === me?.uid) refresh() // renamed themselves: the sidebar and session profile follow
  }

  const formName = (ft: string) => {
    const f = forms.find(x => x.formType === ft)
    return f?.name || f?.title || ft
  }

  if (!profile) return (
    <div className="flex items-center gap-2 p-4 text-sm text-stone-500"><Spinner size={16} /> กำลังโหลด...</div>
  )

  const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId ?? folders[0]?.id
  const filtered = applyFilters(subs, filters, { formGroup, formName, groups: folders })
  const viewerIsSuper = isSuperAdmin(me)
  // Only the Super Admin may edit the Super Admin's account, rename usernames and set others' passwords.
  const canEdit = !isSuperAdmin(profile) || viewerIsSuper
  // Any admin can hand someone a new password (and a signature); only the Super
  // Admin touches the Super Admin's own account.
  const canManage = canManageLogin(me, profile)
  const canSetPassword = canManage && profile.uid !== me?.uid
  const live = subs.filter(s => !s.voided)
  const lastAt = subs.reduce((m, s) => Math.max(m, s.createdAt), 0)
  const stats = [
    { label: 'เอกสารทั้งหมด', value: `${live.length} ฉบับ` },
    { label: 'ยอดรวม (บาท)', value: formatMoney(live.reduce((sum, s) => sum + submissionAmount(s), 0)) },
    { label: 'ทำล่าสุด', value: lastAt ? formatDate(lastAt) : '—' },
  ]

  return (
    <div>
      <PageHeader
        icon={<UserRound size={20} />}
        title="ข้อมูลพนักงาน"
        subtitle={`${profile.firstName} ${profile.lastName}`.trim()}
        onBack={() => nav('/admin/employees')}
        actions={canEdit && (
          <Link to={`/admin/employees/${profile.uid}/edit`} className={ui.btnPrimary}>
            <Pencil size={16} /> แก้ไขข้อมูล
          </Link>
        )}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <EmployeeSummaryCard
          person={profile}
          companies={companies}
          groups={groups}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <LoginInfo
            profile={profile}
            onSetPassword={canSetPassword ? () => setSettingPassword(true) : undefined}
            onChangeUsername={viewerIsSuper ? () => setChangingUsername(true) : undefined}
          />

          {/* Not everyone can manage a signature image on their own; an admin can
              put one on the account so the person can sign documents online. */}
          <div className={ui.card}>
            <div className="mb-1 flex items-center gap-2">
              <PenLine size={16} className="text-stone-400" />
              <h2 className={ui.cardTitle}>ลายเซ็น</h2>
            </div>
            <p className="mb-4 text-xs text-stone-500">ใช้ตอนเซ็นเอกสารออนไลน์ · แนะนำรูปพื้นหลังโปร่ง</p>
            <SignatureField uid={profile.uid} signature={profile.signatureImage} canEdit={canManage} onChanged={loadProfile} />
          </div>

          {/* Their documents in three figures */}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:col-span-2">
            {stats.map(s => (
              <div key={s.label} className={ui.card}>
                <dt className="text-xs font-medium text-stone-500">{s.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <section className="mt-8">
        <h2 className={`${ui.cardTitle} mb-3 flex items-center gap-2`}>
          <FileText size={16} className="text-stone-400" /> เอกสารของ {profile.firstName || 'พนักงาน'}
        </h2>
        <div className="mb-4">
          <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={folders} formGroup={formGroup}
            resultCount={filtered.length} total={subs.length} />
        </div>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead className={ui.thead}>
              <tr>{HEADERS.map(h => <th key={h.label} className={`${ui.th} ${h.cls}`}>{h.label}</th>)}</tr>
            </thead>
            <tbody className={ui.tbody}>
              {filtered.map(r => (
                <tr key={r.id} className={ui.tr}>
                  <td className={`${ui.td} whitespace-nowrap font-mono text-[13px]`}><DocNumberCell sub={r} /></td>
                  <td className={`${ui.td} font-medium text-stone-900`}>{formName(r.formType)}</td>
                  <td className={`${ui.td} whitespace-nowrap`}>{formatDate(r.createdAt)}</td>
                  <td className={`${ui.td} whitespace-nowrap text-right tabular-nums`}>{formatMoney(submissionAmount(r))}</td>
                  <td className={`${ui.td} whitespace-nowrap`}>
                    <span className="inline-flex items-center gap-2">
                      <StatusBadge sub={r} />
                      {editLabel(r, vcounts) && <span className="text-xs text-ochre-700" title="จำนวนครั้งที่แก้ไขหลังบันทึก">✎ {editLabel(r, vcounts)}</span>}
                    </span>
                  </td>
                  <td className={`${ui.td} whitespace-nowrap`}>
                    {r.printCount > 0
                      ? <>{formatDateTime(r.lastPrintedAt)} <span className="text-xs text-stone-500">· {r.printCount} ครั้ง</span></>
                      : <span className="text-stone-500">ยังไม่พิมพ์</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <ActionGroup>
                        {!r.voided && !isSigned(r) && <ActionGroupItem label="แก้ไขเอกสาร" short="แก้ไข" to={`/submission/${r.id}`} icon={<Pencil size={15} />} />}
                        <ActionGroupItem label="ดูเอกสาร / สั่งพิมพ์" short="พิมพ์" to={`/submission/${r.id}/preview`} icon={<Printer size={15} />} />
                      </ActionGroup>
                      <RowMenu
                        items={[{ label: 'ลบเอกสาร', icon: <Trash2 size={16} />, onClick: () => onDeleteSub(r), danger: true }]}
                        label={`ตัวเลือกเพิ่มเติม ${r.docNumber}`}
                      />
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
      </section>

      {settingPassword && <SetPasswordModal profile={profile} onClose={() => setSettingPassword(false)} onDone={loadProfile} />}
      {changingUsername && <ChangeUsernameModal profile={profile} onClose={() => setChangingUsername(false)} onDone={afterUsernameChange} />}
    </div>
  )
}
