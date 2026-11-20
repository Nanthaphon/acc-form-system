import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Building2, FileText, Mail, Pencil, PenLine, Printer, Tags, Trash2, UserRound, Users } from 'lucide-react'
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
import { canManageLogin, isSuperAdmin, roleLabel, roleTone } from '../../shared/roles'
import { initialsOf } from '../../shared/initials'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import { ActionGroup, ActionGroupItem, RowMenu } from '../../components/RowActions'
import StatusBadge from '../../components/StatusBadge'
import LoginInfo from '../../components/LoginInfo'
import SignatureField from '../../components/SignatureField'
import SetPasswordModal from '../../components/SetPasswordModal'
import ChangeUsernameModal from '../../components/ChangeUsernameModal'
import { Spinner } from '../../components/Spinner'
import { Badge, PageHeader, ui } from '../../components/ui'
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
  const name = `${profile.firstName} ${profile.lastName}`.trim()
  const company = companies.find(c => c.id === profile.companyId)
  const details = [
    { icon: <Building2 size={13} />, label: 'บริษัท', value: company?.shortName || company?.name },
    { icon: <Users size={13} />, label: 'แผนก', value: profile.department },
    { icon: <Tags size={13} />, label: 'กลุ่มการเข้าถึง', value: groups.find(g => g.id === profile.accessGroup)?.name },
    { icon: <Mail size={13} />, label: 'อีเมล', value: profile.email },
  ]
  const stats = [
    { label: 'เอกสาร', value: `${live.length} ฉบับ` },
    { label: 'ยอดรวม (บาท)', value: formatMoney(live.reduce((sum, s) => sum + submissionAmount(s), 0)) },
    { label: 'ทำล่าสุด', value: lastAt ? formatDate(lastAt) : '—' },
  ]

  return (
    <div>
      <PageHeader
        icon={<UserRound size={20} />}
        title={name || 'ข้อมูลพนักงาน'}
        onBack={() => nav('/admin/employees')}
        actions={canEdit && (
          <Link to={`/admin/employees/${profile.uid}/edit`} className={ui.btnPrimary}>
            <Pencil size={16} /> แก้ไขข้อมูล
          </Link>
        )}
      />

      {/* Who it is, where they belong, and their documents in three figures */}
      <section className={`${ui.card} mb-6`}>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-clay-600 text-xl font-semibold text-white">
              {initialsOf(profile.firstName, profile.lastName) || '?'}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-stone-900">{name || '—'}</h2>
                {profile.nickname && <span className="text-sm text-stone-500">({profile.nickname})</span>}
                <Badge tone={roleTone(profile)}>{roleLabel(profile)}</Badge>
                {profile.centralStatus === 'resigned' && <Badge tone="amber">ลาออกแล้ว</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-stone-600">{profile.position || '—'}</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-stone-200/70 rounded-xl bg-stone-50 py-3">
            {stats.map(st => (
              <div key={st.label} className="min-w-[7.5rem] px-5">
                <dt className="text-xs text-stone-500">{st.label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-stone-900">{st.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-4 border-t border-stone-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {details.map(d => (
            <div key={d.label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-stone-500">{d.icon} {d.label}</dt>
              <dd className={`mt-1 break-words text-sm ${d.value ? 'text-stone-800' : 'text-stone-400'}`}>{d.value || '—'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <LoginInfo
          profile={profile}
          onSetPassword={canSetPassword ? () => setSettingPassword(true) : undefined}
          onChangeUsername={viewerIsSuper ? () => setChangingUsername(true) : undefined}
        />
        {/* An admin can put a signature on the account so the person can sign online. */}
        <div className={ui.card}>
          <h2 className={`${ui.cardTitle} mb-4 flex items-center gap-2`}><PenLine size={16} className="text-stone-400" /> ลายเซ็น</h2>
          <SignatureField uid={profile.uid} signature={profile.signatureImage} canEdit={canManage} onChanged={loadProfile} />
        </div>
      </div>

      <section>
        <h2 className={`${ui.cardTitle} mb-3 flex items-center gap-2`}>
          <FileText size={16} className="text-stone-400" /> เอกสารของ {profile.firstName || 'พนักงาน'}
        </h2>
        <div className="mb-4">
          <SubmissionFilterBar value={filters} onChange={setFilters} forms={forms} groups={folders} formGroup={formGroup}
            resultCount={filtered.length} total={subs.length} />
        </div>
        <div className={ui.tableCard}>
          <div className={ui.tableScroll}>
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
                        {!r.voided && !isSigned(r) && <ActionGroupItem label="แก้ไขเอกสาร" to={`/submission/${r.id}`} icon={<Pencil size={15} />} />}
                        <ActionGroupItem label="ดูเอกสาร / สั่งพิมพ์" to={`/submission/${r.id}/preview`} icon={<Printer size={15} />} />
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
        </div>
      </section>

      {settingPassword && <SetPasswordModal profile={profile} onClose={() => setSettingPassword(false)} onDone={loadProfile} />}
      {changingUsername && <ChangeUsernameModal profile={profile} onClose={() => setChangingUsername(false)} onDone={afterUsernameChange} />}
    </div>
  )
}
