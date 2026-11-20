import { useState } from 'react'
import type { ReactNode } from 'react'
import { DatabaseZap, X } from 'lucide-react'
import { syncEmployees } from '../data/employeeSync'
import type { SyncSummary } from '../data/employeeSync'
import { Spinner } from './Spinner'
import { ui } from './ui'

const FIELD_LABEL: Record<string, string> = {
  firstName: 'ชื่อ', lastName: 'นามสกุล', position: 'ตำแหน่ง', department: 'แผนก', companyId: 'บริษัท', email: 'อีเมล',
}

// One collapsible list of people in the result.
function Group({ title, tone, items }: { title: string; tone: 'ok' | 'warn' | 'bad' | 'muted'; items: ReactNode[] }) {
  if (items.length === 0) return null
  const dot = { ok: 'bg-olive-500', warn: 'bg-ochre-500', bad: 'bg-brick-600', muted: 'bg-stone-400' }[tone]
  return (
    <details className="rounded-lg border border-stone-200" open={items.length <= 5}>
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-stone-800">
        <span className={`h-2 w-2 rounded-full ${dot}`} /> {title} <span className="text-stone-500">{items.length}</span>
      </summary>
      <ul className="scroll-slim max-h-48 space-y-1 overflow-auto border-t border-stone-100 px-3 py-2 text-[13px] text-stone-700">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </details>
  )
}

const who = (p: { employeeId: string; name: string }) => <><span className="font-mono">{p.employeeId}</span> {p.name}</>

function SyncResult({ r }: { r: SyncSummary }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-700">
        ระบบกลางมี {r.centralCount} คน · {r.dryRun ? 'จะอัปเดต' : 'อัปเดตแล้ว'} {r.updated.length} คน · ตรงกันอยู่แล้ว {r.unchanged} คน
      </p>
      <Group title={r.dryRun ? 'จะอัปเดต' : 'อัปเดตแล้ว'} tone="ok" items={r.updated.map(u => <>{who(u)} <span className="text-stone-500">— {u.changed.map(f => FIELD_LABEL[f] ?? f).join(', ')}</span></>)} />
      <Group title="บันทึกไม่สำเร็จ" tone="bad" items={r.failed.map(f => <><span className="font-mono">{f.employeeId}</span> <span className="text-stone-500">— {f.error}</span></>)} />
      <Group title="ลาออกแล้วตามระบบกลาง (ยังเข้าระบบนี้ได้ ลบหรือเปลี่ยนรหัสผ่านเองถ้าต้องการ)" tone="warn" items={r.resigned.map(p => <>{who(p)} <span className="text-stone-500">— ออก {p.resignDate}</span></>)} />
      <Group title="ไม่พบรหัสพนักงานนี้ในระบบกลาง (แก้ข้อมูลในระบบนี้ได้ตามเดิม)" tone="warn" items={r.notInCentral.map(who)} />
      <Group title="ชื่อบริษัทในระบบกลางที่ไม่ตรงกับบริษัทในระบบนี้ (ไม่ได้เปลี่ยนบริษัทให้)" tone="warn" items={r.unknownCompanies.map(c => c)} />
      <Group title="พนักงานในระบบกลางที่ยังไม่มีบัญชีในระบบนี้" tone="muted" items={r.notHere.map(p => <>{who(p)} <span className="text-stone-500">— {p.company}</span></>)} />
    </div>
  )
}

export default function EmployeeSyncModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState<'preview' | 'sync' | null>(null)
  const [result, setResult] = useState<SyncSummary | null>(null)
  const [error, setError] = useState('')

  async function run(dryRun: boolean) {
    setBusy(dryRun ? 'preview' : 'sync'); setError('')
    try {
      const r = await syncEmployees(dryRun)
      setResult(r)
      if (!dryRun) onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  const close = () => { if (!busy) onClose() }
  const synced = result && !result.dryRun

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4 sm:p-8" onClick={close}>
      <div role="dialog" aria-label="ซิงก์ข้อมูลพนักงาน" className="w-full max-w-2xl rounded-lg border border-stone-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-600"><DatabaseZap size={18} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-stone-900">ซิงก์ข้อมูลพนักงานจากระบบกลาง</h2>
            <p className="text-xs text-stone-500">ชื่อ นามสกุล ตำแหน่ง แผนก บริษัท อีเมล · จับคู่ด้วยรหัสพนักงาน · ไม่สร้าง ไม่ลบบัญชี</p>
          </div>
          <button onClick={close} aria-label="ปิด" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-brick-600">{error}</div>}
        {result && <SyncResult r={result} />}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {synced ? (
            <button type="button" className={ui.btnPrimary} onClick={onClose}>เสร็จ</button>
          ) : (
            <>
              <button type="button" className={ui.btnSecondary} disabled={!!busy} onClick={() => run(true)}>
                {busy === 'preview' ? <><Spinner size={16} /> กำลังตรวจ...</> : 'ดูก่อนว่าจะเปลี่ยนอะไร'}
              </button>
              <button type="button" className={ui.btnPrimary} disabled={!!busy} onClick={() => run(false)}>
                {busy === 'sync' ? <><Spinner size={16} /> กำลังซิงก์...</> : <><DatabaseZap size={16} /> ซิงก์เลย</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
