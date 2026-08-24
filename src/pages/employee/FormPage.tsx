import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { ArrowLeft, Download, PenLine, Printer, Receipt, Save } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import type { ExpenseHeader, ExpenseRow, ExpenseTotals, Company, FormSettings, SubmissionVersion, DocSignature } from '../../types/schema'
import { emptyRow, EXPENSE_CLAIM_DEFAULTS, DEFAULT_SIGNATURE_BLOCKS } from '../../types/schema'
import { computeColumnTotals, grandTotal, taxSummary } from '../../features/expense-claim/calc'
import { bahtText } from '../../shared/bahttext'
import ExpenseClaimForm from '../../features/expense-claim/ExpenseClaimForm'
import VersionHistory from '../../components/VersionHistory'
import SignerSelect from '../../components/SignerSelect'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { ExpenseClaimPdf } from '../../features/expense-claim/ExpenseClaimPdf'
import { createSubmission, updateSubmission, getSubmission, incrementPrint, assignSigners, signDocument, listSigners } from '../../data/submissions'
import type { Signer } from '../../data/submissions'
import { getCompany, listCompanies } from '../../data/companies'
import { getFormSettings } from '../../data/formSettings'

export default function FormPage() {
  const { id, formType } = useParams()
  const { profile } = useAuth()
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [settings, setSettings] = useState<FormSettings>(EXPENSE_CLAIM_DEFAULTS)
  const [docNumber, setDocNumber] = useState('(ยังไม่บันทึก)')
  const [savedId, setSavedId] = useState<string | null>(id ?? null)
  const [showPreview, setShowPreview] = useState(false)
  const [versionRefresh, setVersionRefresh] = useState(0)
  const [sigs, setSigs] = useState<DocSignature[]>([])
  const [assign, setAssign] = useState<Record<string, string>>({}) // blockId -> signer uid
  const [signers, setSigners] = useState<Signer[]>([])
  const [header, setHeader] = useState<ExpenseHeader>({
    subject: 'ขออนุมัติเบิกค่าใช้จ่าย', categories: [], companyId: profile?.companyId ?? '',
    firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '',
    position: profile?.position ?? '', job: profile?.defaultJob ?? '',
  })
  const [items, setItems] = useState<ExpenseRow[]>([emptyRow(EXPENSE_CLAIM_DEFAULTS.columns)])

  function buildTotals(): ExpenseTotals {
    const subtotal = grandTotal(settings.columns, items)
    const tax = taxSummary(subtotal, header.vat, header.whtRate)
    return {
      columnTotals: computeColumnTotals(settings.columns, items),
      grandTotal: subtotal,
      amountInThaiText: bahtText(tax.netTotal),
      vatAmount: tax.vatAmount,
      whtAmount: tax.whtAmount,
      netTotal: tax.netTotal,
    }
  }

  useEffect(() => { listSigners().then(setSigners) }, [])
  useEffect(() => { // EDIT mode: load existing submission + its form settings
    if (!id) return
    getSubmission(id).then(s => {
      if (!s) return
      setHeader(s.header); setItems(s.items); setDocNumber(s.docNumber); setSavedId(s.id)
      const list = s.signatures ?? []
      setSigs(list)
      setAssign(Object.fromEntries(list.map(x => [x.blockId, x.assignedUid])))
      getFormSettings(s.formType).then(setSettings)
    })
  }, [id])
  useEffect(() => { // NEW mode: load the form settings for this formType
    if (id || !formType) return
    getFormSettings(formType).then(fs => { setSettings(fs); setItems([emptyRow(fs.columns)]) })
  }, [id, formType])
  useEffect(() => { if (header.companyId) getCompany(header.companyId).then(setCompany) }, [header.companyId])
  useEffect(() => { listCompanies().then(setCompanies) }, [])

  async function save() {
    const totals = buildTotals()
    // Require a total > 0 only for forms that actually have amount columns.
    const hasNumericCol = settings.columns.some(c => c.type === 'number' || c.type === 'calc')
    if (hasNumericCol && totals.grandTotal <= 0) {
      alert('กรุณากรอกยอดเงินอย่างน้อย 1 รายการ (ยอดรวมต้องมากกว่า 0)')
      return
    }
    if (!header.firstName.trim() || !header.lastName.trim() || !header.position.trim()) {
      alert('กรุณากรอกชื่อ นามสกุล และตำแหน่งให้ครบถ้วน')
      return
    }
    const editor = { uid: profile!.uid, name: `${profile!.firstName ?? ''} ${profile!.lastName ?? ''}`.trim() }
    try {
      if (savedId) {
        const existing = await getSubmission(savedId)
        if (existing) await updateSubmission(savedId, { ...existing, header, items, totals }, editor)
      } else {
        const created = await createSubmission({
          formType: settings.formType, header, items, totals,
          createdBy: profile!.uid, createdByEmployeeId: profile!.employeeId,
        }, settings.formCode || settings.formType, editor)
        setSavedId(created.id); setDocNumber(created.docNumber)
      }
      setVersionRefresh(n => n + 1)
      alert('บันทึกแล้ว')
    } catch {
      alert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  function handleRestore(v: SubmissionVersion) {
    setHeader(v.header); setItems(v.items); setShowPreview(false)
    alert(`ดึงเนื้อหาเวอร์ชัน ${v.version} กลับมาแล้ว — ตรวจสอบแล้วกด "บันทึก" เพื่อสร้างเป็นเวอร์ชันใหม่`)
  }

  async function downloadPdf() {
    const blob = await pdf(<ExpenseClaimPdf company={company} header={header} items={items} docNumber={docNumber} settings={settings} signatures={sigs} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${docNumber}.pdf`; a.click()
  }
  async function print() {
    if (savedId) await incrementPrint(savedId)
    window.print()
  }

  const allBlocks = settings.signatureBlocks?.length ? settings.signatureBlocks : DEFAULT_SIGNATURE_BLOCKS
  const requesterBlockId = allBlocks[0]?.id           // first block is always the requester (ผู้เบิก)
  const isSelfBlock = (id: string) => id === requesterBlockId
  const onlineBlocks = allBlocks.filter(b => b.online)
  const signerName = (uid: string) => signers.find(s => s.uid === uid)?.name ?? ''
  const sigFor = (blockId: string) => sigs.find(x => x.blockId === blockId)

  const myName = () => `${profile!.firstName ?? ''} ${profile!.lastName ?? ''}`.trim()

  async function sendForSign() {
    if (!savedId) { alert('กรุณาบันทึกเอกสารก่อนส่งให้เซ็น'); return }
    const pending = onlineBlocks.filter(b => sigFor(b.id)?.status !== 'signed')
    // signer must be picked for every non-self block; self blocks are the requester
    if (pending.some(b => !isSelfBlock(b.id) && !assign[b.id])) { alert('กรุณาเลือกผู้เซ็นให้ครบทุกช่อง'); return }
    const assignments: DocSignature[] = pending.map(b => {
      const uid = isSelfBlock(b.id) ? profile!.uid : assign[b.id]
      return { blockId: b.id, blockLabel: b.label, assignedUid: uid, assignedName: isSelfBlock(b.id) ? myName() : signerName(uid), status: 'pending' as const }
    })
    try {
      await assignSigners(savedId, assignments)
      // Auto-sign the requester's own block if they have a saved signature.
      if (profile?.signatureImage) {
        for (const b of pending.filter(b => isSelfBlock(b.id))) {
          try { await signDocument(savedId, b.id) } catch { /* leave pending on failure */ }
        }
      }
      const updated = await getSubmission(savedId)
      if (updated) setSigs(updated.signatures ?? [])
      alert('ส่งให้เซ็นแล้ว — ผู้ถูกเลือกจะเห็นในเมนู "รอฉันเซ็น"'
        + (profile?.signatureImage ? '' : '\n(ช่องผู้เบิกจะเซ็นได้เมื่อคุณอัปโหลดลายเซ็นในหน้าข้อมูลของฉัน)'))
    } catch (e: any) {
      alert('ส่งให้เซ็นไม่สำเร็จ: ' + (e?.message || 'เกิดข้อผิดพลาด'))
    }
  }

  const isAdmin = profile?.role === 'admin'

  // A closed form (maintenance) is not accessible to employees via direct URL.
  if (!id && settings.active === false && !isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="text-lg font-semibold text-gray-900">ฟอร์มนี้ปิดปรับปรุงชั่วคราว</div>
        <div className="mt-2 text-sm text-gray-500">กรุณากลับมาใหม่ภายหลัง</div>
        <button onClick={() => nav('/')} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">กลับหน้าหลัก</button>
      </div>
    )
  }

  return (
    <div>
      <div className="no-print space-y-4">
        <div className="mb-2 flex items-center gap-3">
          <button
            onClick={() => nav(settings.groupId ? `/group/${settings.groupId}` : '/')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"
          >
            <ArrowLeft size={16} /> กลับ
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500"><Receipt size={20} /></div>
          <h1 className="text-xl font-semibold text-gray-900">{settings.name || settings.title}</h1>
          <button
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'แก้ไข' : 'ดูตัวอย่าง'}
          </button>
        </div>
        {!showPreview && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">บริษัท</label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={header.companyId}
              onChange={e => setHeader({ ...header, companyId: e.target.value })}
            >
              {!header.companyId && <option value="">— เลือกบริษัท —</option>}
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {!showPreview && <ExpenseClaimForm header={header} items={items} onHeaderChange={setHeader} onItemsChange={setItems} columns={settings.columns} categories={settings.categories} />}
        {!showPreview && onlineBlocks.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-1 text-[15px] font-semibold text-gray-900">ผู้เซ็นเอกสาร (ออนไลน์)</div>
            <p className="mb-3 text-xs text-gray-500">
              เลือกคนที่จะให้เซ็นแต่ละช่อง แล้วกด “ส่งให้เซ็น” — คนนั้นจะเห็นในเมนู “รอฉันเซ็น”
              {!savedId && ' · บันทึกเอกสารก่อนจึงจะส่งได้'}
            </p>
            <div className="space-y-2">
              {onlineBlocks.map(b => {
                const sig = sigFor(b.id)
                return (
                  <div key={b.id} className="flex flex-wrap items-center gap-2">
                    <span className="w-36 shrink-0 text-sm text-gray-700">{b.label}</span>
                    {sig?.status === 'signed' ? (
                      <span className="text-sm font-medium text-green-700">✔ เซ็นแล้วโดย {sig.assignedName}</span>
                    ) : isSelfBlock(b.id) ? (
                      <span className="text-sm text-gray-700">ตัวเอง (คุณ){sig?.status === 'pending' ? ' · รอเซ็น' : ''}</span>
                    ) : (
                      <>
                        <SignerSelect
                          className="w-56 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          value={assign[b.id] ?? ''}
                          onChange={uid => setAssign({ ...assign, [b.id]: uid })}
                          signers={signers}
                        />
                        {sig?.status === 'pending' && <span className="text-xs font-medium text-amber-600">รอเซ็น</span>}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-lg border-[1.5px] border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40"
              onClick={sendForSign}
              disabled={!savedId}
            >
              <PenLine size={16} /> ส่งให้เซ็น
            </button>
          </div>
        )}
      </div>
      <div className={showPreview ? '' : 'hidden print:block'}>
        <ExpenseClaimPreview company={company} header={header} items={items} docNumber={docNumber} settings={settings} signatures={sigs} />
      </div>
      <div className="no-print mt-4 flex flex-wrap gap-2.5">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          onClick={save}
        >
          <Save size={16} /> บันทึก
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
          onClick={downloadPdf}
        >
          <Download size={16} /> ดาวน์โหลด PDF
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900"
          onClick={print}
        >
          <Printer size={16} /> สั่งพิมพ์
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800"
          onClick={() => nav('/history')}
        >
          ไปหน้าประวัติ
        </button>
      </div>
      {savedId && (
        <div className="no-print mt-4">
          <VersionHistory
            submissionId={savedId}
            columns={settings.columns}
            settings={settings}
            company={company}
            refreshKey={versionRefresh}
            canRestore={true}
            onRestore={handleRestore}
          />
        </div>
      )}
    </div>
  )
}
