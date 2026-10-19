import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PenLine, Upload } from 'lucide-react'

// Whether the requester's uploaded signature goes on their own line of the
// document as it is saved. A card rather than a bare checkbox: the signature
// sits on a signing line the way it will on paper, and the card says what
// happens either way — so leaving it off is a choice, not an oversight.
// What the card says, on and off. The fill-in screen's wording by default;
// the signing dialog also has an existing signature to keep or take off.
export interface OwnSignatureTexts { on: string; onHint: ReactNode; off: string; offHint: ReactNode }

export default function OwnSignatureToggle({ signature, blockLabel, on, onChange, texts }: {
  signature?: string | null
  blockLabel: string
  on: boolean
  onChange: (on: boolean) => void
  texts?: OwnSignatureTexts
}) {
  const t: OwnSignatureTexts = texts ?? {
    on: 'ลงลายเซ็นของฉันในเอกสาร',
    onHint: <>ใส่ในช่อง “{blockLabel}” ตอนกดบันทึก · ช่องอื่นเว้นไว้เซ็นด้วยปากกา</>,
    off: 'ไม่ใส่ลายเซ็นของฉัน',
    offHint: <>ช่อง “{blockLabel}” จะเว้นว่างไว้เซ็นบนกระดาษ</>,
  }
  if (!signature) {
    return (
      <div className="flex max-w-2xl flex-wrap items-center gap-4 rounded-xl border border-dashed border-ochre-200 bg-ochre-50/60 p-3 pr-4">
        <div className="flex h-14 w-36 shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white text-stone-300">
          <PenLine size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-stone-900">ยังไม่มีลายเซ็นในระบบ</div>
          <div className="mt-0.5 text-xs text-stone-500">อัปโหลดครั้งเดียว ทุกเอกสารจะพิมพ์ออกมาพร้อมลายเซ็นของคุณในช่อง “{blockLabel}”</div>
        </div>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-ochre-700 ring-1 ring-ochre-200 hover:bg-ochre-50"
        >
          <Upload size={15} /> อัปโหลดลายเซ็น
        </Link>
      </div>
    )
  }

  return (
    <label
      className={`flex max-w-2xl cursor-pointer items-center gap-4 rounded-xl border p-3 pr-4 transition-colors ${
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
        <div className="mt-0.5 text-xs text-stone-500">{on ? t.onHint : t.offHint}</div>
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
