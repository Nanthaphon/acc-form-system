import { useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import ActionIconButton from './ActionIconButton'
import { Spinner } from './Spinner'
import { uiAlert, uiConfirm } from './dialog/dialogService'
import { updateProfile } from '../data/users'
import { dbErrorMessage } from '../shared/dbError'

// A data URL this long is roughly a 300KB image — large enough for a clean
// signature, small enough to sit inside every document that carries it.
const MAX_DATA_URL = 400_000

interface Props {
  uid: string
  signature?: string | null
  canEdit?: boolean
  onChanged: () => void | Promise<void>
}

// The saved signature and the controls to replace it — used by someone editing
// their own profile, and by an admin setting one up for an employee who cannot.
export default function SignatureField({ uid, signature, canEdit = true, onChanged }: Props) {
  const [busy, setBusy] = useState(false)

  function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      if (dataUrl.length > MAX_DATA_URL) {
        uiAlert('ไฟล์ใหญ่เกินไป แนะนำลายเซ็นเล็กกว่า ~300KB')
        setBusy(false)
        return
      }
      try { await updateProfile(uid, { signatureImage: dataUrl }); await onChanged() }
      catch (e) { uiAlert(dbErrorMessage(e), { title: 'อัปโหลดลายเซ็นไม่สำเร็จ' }) }
      finally { setBusy(false) }
    }
    reader.onerror = () => { setBusy(false); uiAlert('อ่านไฟล์ไม่สำเร็จ') }
    reader.readAsDataURL(file)
  }

  async function remove() {
    if (!(await uiConfirm('เอกสารที่เซ็นไปแล้วยังมีลายเซ็นอยู่ตามเดิม', { title: 'ลบลายเซ็นนี้ ?', tone: 'danger', confirmText: 'ลบ' }))) return
    setBusy(true)
    try { await updateProfile(uid, { signatureImage: null }); await onChanged() }
    catch (e) { uiAlert(dbErrorMessage(e), { title: 'ลบลายเซ็นไม่สำเร็จ' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-24 w-56 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50">
        {busy
          ? <Spinner size={20} className="text-stone-400" />
          : signature
            ? <img src={signature} alt="ลายเซ็น" className="h-full w-full object-contain p-2" />
            : <span className="text-xs text-stone-400">ยังไม่มีลายเซ็น</span>}
      </div>

      {canEdit && (
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-900">
            <Upload size={16} />
            {signature ? 'เปลี่ยนลายเซ็น' : 'อัปโหลดลายเซ็น'}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={e => pick(e.target.files?.[0])} />
          </label>
          {signature && <ActionIconButton label="ลบลายเซ็น" tone="red" icon={<Trash2 size={16} />} onClick={remove} />}
        </div>
      )}
    </div>
  )
}
