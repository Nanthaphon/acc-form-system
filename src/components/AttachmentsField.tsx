import { useRef } from 'react'
import { Eye, FileText, Paperclip, Trash2 } from 'lucide-react'
import type { Attachment } from '../types/schema'
import ActionIconButton from './ActionIconButton'
import { uiAlert } from './dialog/dialogService'
import {
  checkAttachmentLimits, formatBytes, openAttachment,
  MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_TOTAL_BYTES,
} from '../data/attachments'

interface Props {
  saved: Attachment[]                        // already uploaded to storage
  pending?: File[]                           // picked but not uploaded yet — uploaded on save
  readOnly?: boolean                         // viewers / signers: open only, no add or remove
  onAdd?: (files: File[]) => void
  onRemoveSaved?: (a: Attachment) => void
  onRemovePending?: (index: number) => void
}

// Attachment list + picker for a document. Limits are checked here, before
// anything is staged, so the user hears about a too-big file immediately.
export default function AttachmentsField({ saved, pending = [], readOnly, onAdd, onRemoveSaved, onRemovePending }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const sizes = [...saved.map(a => a.size), ...pending.map(f => f.size)]
  const count = sizes.length
  const total = sizes.reduce((a, b) => a + b, 0)
  const full = count >= MAX_ATTACHMENTS

  function pick(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (inputRef.current) inputRef.current.value = '' // allow picking the same file again
    if (!files.length) return
    const err = checkAttachmentLimits(sizes, files)
    if (err) { uiAlert(err, { title: 'แนบไฟล์ไม่ได้' }); return }
    onAdd?.(files)
  }

  async function open(a: Attachment) {
    try { await openAttachment(a.path) }
    catch { uiAlert('เปิดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง') }
  }

  if (readOnly && count === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-gray-400" />
          <h2 className="text-[15px] font-semibold text-gray-900">ไฟล์แนบ</h2>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
          {count}/{MAX_ATTACHMENTS} ไฟล์ · {formatBytes(total)} / {formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)}
        </span>
      </div>
      {!readOnly && (
        <p className="mb-4 text-xs text-gray-500">
          แนบได้สูงสุด {MAX_ATTACHMENTS} ไฟล์ · ไฟล์ละไม่เกิน {formatBytes(MAX_ATTACHMENT_BYTES)} · รวมไม่เกิน {formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)} · ไฟล์จะอัปโหลดเมื่อกด “บันทึก”
        </p>
      )}

      {count > 0 && (
        <ul className={`divide-y divide-gray-100 rounded-lg border border-gray-100 ${readOnly ? 'mt-3' : 'mb-3'}`}>
          {saved.map(a => (
            <li key={a.path} className="flex items-center gap-3 px-3 py-2">
              <FileText size={16} className="shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-900" title={a.name}>{a.name}</span>
              <span className="shrink-0 text-xs text-gray-400">{formatBytes(a.size)}</span>
              <ActionIconButton label="เปิดไฟล์" icon={<Eye size={16} />} onClick={() => open(a)} />
              {!readOnly && <ActionIconButton label="ลบไฟล์" tone="red" icon={<Trash2 size={16} />} onClick={() => onRemoveSaved?.(a)} />}
            </li>
          ))}
          {pending.map((f, i) => (
            <li key={`pending-${i}-${f.name}`} className="flex items-center gap-3 px-3 py-2">
              <FileText size={16} className="shrink-0 text-blue-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-900" title={f.name}>{f.name}</span>
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">รอบันทึก</span>
              <span className="shrink-0 text-xs text-gray-400">{formatBytes(f.size)}</span>
              <ActionIconButton label="เอาไฟล์ออก" tone="red" icon={<Trash2 size={16} />} onClick={() => onRemovePending?.(i)} />
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <label
          className={`inline-flex items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm font-medium ${
            full ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'cursor-pointer border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          <Paperclip size={16} /> {full ? `ครบ ${MAX_ATTACHMENTS} ไฟล์แล้ว` : 'แนบไฟล์'}
          <input ref={inputRef} type="file" multiple className="hidden" disabled={full} onChange={e => pick(e.target.files)} />
        </label>
      )}
    </div>
  )
}
