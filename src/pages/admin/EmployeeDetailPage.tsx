import { uiAlert, uiConfirm } from '../../components/dialog/dialogService'
import { PageSkeleton } from '../../components/TableSkeleton'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileText, Pencil, Printer, Signature, Trash2, UserRound } from 'lucide-react'
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
import { chainRows, chainLength } from '../../shared/revisionChain'
import { usePagination } from '../../shared/usePagination'
import SubmissionFilterBar from '../../components/SubmissionFilterBar'
import Pagination from '../../components/Pagination'
import { ActionGroup, ActionGroupItem } from '../../components/RowActions'
import ActionIconButton from '../../components/ActionIconButton'
import StatusBadge from '../../components/StatusBadge'
import LoginInfo from '../../components/LoginInfo'
import SignatureField from '../../components/SignatureField'
import SetPasswordModal from '../../components/SetPasswordModal'
import ChangeUsernameModal from '../../components/ChangeUsernameModal'
import { Badge, PageHeader, SectionTitle, ui } from '../../components/ui'
import DocNumberCell from '../../components/DocNumberCell'
import { formatMoney } from '../../shared/money'

const HEADERS = [
  { label: 'ชื่อฟอร์ม', cls: '' },
  { label: 'เลขที่', cls: '' },
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
  const formGroup = (ft: string) => forms.find(f => f.formType === ft)?.groupId ?? folders[0]?.id
  const filtered = applyFilters(subs, filters, { formGroup, formName, groups: folders })
  // As on ประวัติการพิมพ์ทั้งหมด: a corrected document and its earlier rounds
  // are one line, ten lines a page.
  const chains = chainRows(filtered, subs)
  const pager = usePagination(chains, { pageSize: 10, storageKey: 'pageSize:employeeDocs' })
  function changeFilters(f: Filters) { setFilters(f); pager.setPage(1) }

  if (!profile) return (
    <PageSkeleton />
  )

  const viewerIsSuper = isSuperAdmin(me)
  // Only the Super Admin may edit the Super Admin's account, rename usernames and set others' passwords.
  const canEdit = !isSuperAdmin(profile) || viewerIsSuper
  // Any admin can hand someone a new password (and a signature); only the Super
  // Admin touches the Super Admin's own account.
  const canManage = canManageLogin(me, profile)
  const canSetPassword = canManage && profile.uid !== me?.uid
  const name = `${profile.firstName} ${profile.lastName}`.trim()
  const company = companies.find(c => c.id === profile.companyId)
  const details: { label: string; value?: string | null }[] = [
    { label: 'ชื่อ-นามสกุล', value: name },
    { label: 'ชื่อเล่น', value: profile.nickname },
    { label: 'รหัสพนักงาน', value: profile.employeeId },
    { label: 'ตำแหน่ง', value: profile.position },
    { label: 'แผนก', value: profile.department },
    { label: 'บริษัท', value: company?.shortName || company?.name },
    { label: 'อีเมล', value: profile.email },
    { label: 'กลุ่มการเข้าถึง', value: groups.find(g => g.id === profile.accessGroup)?.name },
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

      {/* The person's details, label above value */}
      <section className={`${ui.card} mb-6`}>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <SectionTitle icon={<UserRound size={16} />}>ข้อมูลพนักงาน</SectionTitle>
          <Badge tone={roleTone(profile)}>{roleLabel(profile)}</Badge>
          {profile.centralStatus === 'resigned' && <Badge tone="amber">ลาออกแล้ว</Badge>}
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {details.map(d => (
            <div key={d.label} className="min-w-0">
              <dt className="text-xs text-stone-500">{d.label}</dt>
              <dd className={`mt-1 break-words text-sm ${d.value ? 'font-medium text-stone-900' : 'text-stone-400'}`}>{d.value || '—'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <LoginInfo
          profile={profile}
          onSetPassword={canSetPassword ? () => setSettingPassword(true) : undefined}
          onChangeUsername={viewerIsSuper ? () => setChangingUsername(true) : undefined}
        />
        {/* An admin can put a signature on the account so the person can sign online. */}
        <div className={ui.card}>
          <SectionTitle icon={<Signature size={16} />} className="mb-4">ลายเซ็น</SectionTitle>
          <SignatureField uid={profile.uid} signature={profile.signatureImage} canEdit={canManage} onChanged={loadProfile} />
        </div>
      </div>

      {/* Their documents — the same filter bar, table and pages as ประวัติการพิมพ์ทั้งหมด */}
      <section>
        <SectionTitle icon={<FileText size={16} />} className="mb-3">เอกสาร</SectionTitle>
        <div className="mb-4">
          <SubmissionFilterBar value={filters} onChange={changeFilters} forms={forms} groups={folders} formGroup={formGroup}
            resultCount={chains.length} total={chainRows(subs).length} />
        </div>
        <div className={ui.tableCard}>
          <div className={ui.tableScroll}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>{HEADERS.map(h => <th key={h.label} className={`${ui.th} ${h.cls}`}>{h.label}</th>)}</tr>
              </thead>
              <tbody className={ui.tbody}>
                {pager.pageItems.map(({ latest: r, older }) => (
                  <tr key={r.id} className={ui.tr}>
                    <td className={`${ui.td} whitespace-nowrap font-medium text-stone-900`}>
                      <div className="flex items-center gap-1.5">
                        <span className="max-w-[240px] truncate" title={formName(r.formType)}>{formName(r.formType)}</span>
                        {older.length > 0 && (
                          <span className="rounded-md border border-stone-200 px-1.5 text-[11px] font-medium text-stone-600" title="จำนวนฉบับรวมฉบับแก้ไข">
                            {chainLength({ latest: r, older })} ฉบับ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap font-mono text-[13px]`}><DocNumberCell sub={r} /></td>
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
                        <ActionIconButton label={`ลบเอกสาร ${r.docNumber}`} tone="red" icon={<Trash2 size={16} />} onClick={() => onDeleteSub(r)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {chains.length === 0 && (
                  <tr>
                    <td colSpan={HEADERS.length} className={ui.emptyCell}>
                      {subs.length === 0 ? 'ยังไม่มีเอกสาร' : 'ไม่พบเอกสารที่ตรงกับตัวกรอง'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {chains.length > 0 && (
            <Pagination page={pager.page} pageCount={pager.pageCount} pageSize={pager.pageSize} from={pager.from} to={pager.to} total={pager.total}
              onPage={pager.setPage} onPageSize={pager.setPageSize} />
          )}
        </div>
      </section>

      {settingPassword && <SetPasswordModal profile={profile} onClose={() => setSettingPassword(false)} onDone={loadProfile} />}
      {changingUsername && <ChangeUsernameModal profile={profile} onClose={() => setChangingUsername(false)} onDone={afterUsernameChange} />}
    </div>
  )
}
