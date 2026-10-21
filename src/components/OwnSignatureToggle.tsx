import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PenLine, Upload } from 'lucide-react'
import { Spinner } from './Spinner'
import { uiAlert } from './dialog/dialogService'
import { dbErrorMessage } from '../shared/dbError'
import { SignatureFileError, saveSignatureFile } from '../shared/signatureFile'

// Whether the requester's uploaded signature goes on their own line of the
// document as it is saved. A card rather than a bare checkbox: the signature
// sits on a signing line the way it will on paper, and the card says what
// happens either way — so leaving it off is a choice, not an oversight.
// What the card says, on and off. The fill-in screen's wording by default;
// the signing dialog also has an existing signature to keep or take off.
export interface OwnSignatureTexts { on: string; onHint?: ReactNode; off: string; offHint?: ReactNode }

// Who the signature is uploaded for, and what to reload once it is saved.
export interface SignatureUpload { uid: string; onUploaded: () => void | Promise<void> }

// No signature yet: pick an image (or drop one on the card) and it is saved to
// the profile on the spot — no trip to the profile page in the middle of a form.
function UploadCard({ blockLabel, fullWidth, upload, onDone }: {
  blockLabel: string; fullWidth?: boolean; upload?: SignatureUpload; onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  async function take(file: File | undefined) {
    if (!file || !upload || busy) return
    setBusy(true)
    try { await saveSignatureFile(upload.uid, file); await upload.onUploaded(); onDone() }
    catch (e) { uiAlert(e instanceof SignatureFileError ? e.message : dbErrorMessage(e), { title: 'อัปโหลดลายเซ็นไม่สำเร็จ' }) }
    finally { setBusy(false) }
  }
  const button = 'inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-ochre-700 ring-1 ring-ochre-200 hover:bg-ochre-50'
  return (
    <div
      onDragOver={upload ? e => { e.preventDefault(); setOver(true) } : undefined}
      onDragLeave={upload ? () => setOver(false) : undefined}
      onDrop={upload ? e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]) } : undefined}
      className={`flex ${fullWidth ? '' : 'max-w-2xl'} flex-wrap items-center gap-4 rounded-xl border border-dashed p-3 pr-4 transition-colors ${
        over ? 'border-clay-500 bg-clay-50' : 'border-ochre-200 bg-ochre-50/60'
      }`}
    >
      <div className="flex h-14 w-36 shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white text-stone-300">
        {busy ? <Spinner size={20} className="text-stone-400" /> : <PenLine size={20} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-stone-900">ยังไม่มีลายเซ็นในระบบ</div>
        <div className="mt-0.5 text-xs text-stone-500">
          {upload ? 'เลือกไฟล์รูปลายเซ็น หรือลากมาวางที่นี่ · ใช้กับทุกเอกสารต่อจากนี้' : <>อัปโหลดครั้งเดียว ทุกเอกสารจะมีลายเซ็นของคุณในช่อง “{blockLabel}”</>}
        </div>
      </div>
      {upload ? (
        <label className={`${button} cursor-pointer ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <Upload size={15} /> {busy ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ลายเซ็น'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="เลือกไฟล์ลายเซ็น"
            disabled={busy}
            onChange={e => { take(e.target.files?.[0]); e.target.value = '' }}
          />
        </label>
      ) : (
        <Link to="/profile" className={button}><Upload size={15} /> อัปโหลดลายเซ็น</Link>
      )}
    </div>
  )
}

export default function OwnSignatureToggle({ signature, blockLabel, on, onChange, texts, fullWidth, upload }: {
  signature?: string | null
  blockLabel: string
  on: boolean
  onChange: (on: boolean) => void
  texts?: OwnSignatureTexts
  fullWidth?: boolean   // fill the space it is given (a dialog) rather than keep to a form-width card
  upload?: SignatureUpload   // lets a missing signature be uploaded right here
}) {
  // The fill-in screen says no more than this: the sheet beside it shows
  // where the signature goes.
  const t: OwnSignatureTexts = texts ?? { on: 'ลายเซ็นของฉันในเอกสาร', off: 'ไม่ใส่ลายเซ็นของฉัน' }
  const hint = on ? t.onHint : t.offHint
  // Uploaded to be used: the card turns on with it.
  if (!signature) return <UploadCard blockLabel={blockLabel} fullWidth={fullWidth} upload={upload} onDone={() => onChange(true)} />

  return (
    <label
      className={`flex ${fullWidth ? '' : 'max-w-2xl'} cursor-pointer items-center gap-4 rounded-xl border p-3 pr-4 transition-colors ${
        on ? 'border-clay-300 bg-clay-50/70 shadow-sm' : 'border-stone-200 bg-white hover:border-stone-300'
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={on}
        onChange={e => onChange(e.target.checked)}
        aria-label={`ใส่ลายเซ็นของฉันในช่อง “${blockLabel}”`}
      />
      {/* The signature on its line, as it will print — faded while it is left off. */}
      <div className="relative flex h-14 w-36 shrink-0 items-end justify-center rounded-lg border border-stone-200 bg-white px-3 pb-2">
        <img
          src={signature}
          alt="ลายเซ็นของฉัน"
          className={`max-h-9 max-w-full object-contain transition-opacity ${on ? 'opacity-100' : 'opacity-25 grayscale'}`}
        />
        <span className="absolute inset-x-3 bottom-2 border-b border-dotted border-stone-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${on ? 'text-stone-900' : 'text-stone-500'}`}>
          {on ? t.on : t.off}
        </div>
        {hint && <div className="mt-0.5 text-xs text-stone-500">{hint}</div>}
      </div>
      {/* Drawn switch; the real control is the checkbox above (keyboard, screen readers). */}
      <span
        aria-hidden
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-clay-600/30 ${on ? 'bg-clay-600' : 'bg-stone-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </span>
    </label>
  )
}
