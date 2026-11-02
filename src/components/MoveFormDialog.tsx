import { useState } from 'react'
import { Folder, FolderInput } from 'lucide-react'
import type { FormGroup, FormSettings } from '../types/schema'
import { formDisplayName } from '../shared/formSort'
import { ui } from './ui'

interface Props {
  form: FormSettings
  groups: FormGroup[]          // in folder order (orderFolders)
  current: string | undefined  // the folder it is in now
  onMove: (groupId: string) => Promise<void>
  onClose: () => void
}

// Picks the folder a form moves to: every folder, its sub-folders indented
// beneath it. The documents made on the form are not touched.
export default function MoveFormDialog({ form, groups, current, onMove, onClose }: Props) {
  const [picked, setPicked] = useState(current ?? '')
  const [busy, setBusy] = useState(false)
  const known = new Set(groups.map(g => g.id))

  async function submit() {
    if (!picked || picked === current) return
    setBusy(true)
    try { await onMove(picked) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4" onMouseDown={onClose}>
        <form
          role="dialog"
          aria-modal="true"
          aria-label="ย้ายฟอร์มไปโฟลเดอร์อื่น"
          className="w-full max-w-md rounded-lg border border-stone-200 bg-white shadow-2xl"
          onMouseDown={e => e.stopPropagation()}
          onSubmit={e => { e.preventDefault(); submit() }}
        >
          <div className="flex items-center gap-3 border-b border-stone-100 px-6 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-600"><FolderInput size={18} /></div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-stone-900">ย้ายไปโฟลเดอร์</h2>
              <p className="truncate text-xs text-stone-500">{formDisplayName(form)}</p>
            </div>
          </div>
          <div className="scroll-slim max-h-[50vh] overflow-y-auto px-3 py-3" role="radiogroup" aria-label="โฟลเดอร์">
            {groups.map(g => {
              const sub = !!g.parentId && known.has(g.parentId)
              const on = picked === g.id
              return (
                <label key={g.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${sub ? 'ml-6' : ''} ${on ? 'bg-clay-50 text-clay-800' : 'text-stone-700 hover:bg-stone-50'}`}>
                  <input type="radio" name="folder" value={g.id} checked={on} onChange={() => setPicked(g.id)} className="accent-clay-600" />
                  <Folder size={16} className={on ? 'text-clay-600' : 'text-stone-400'} />
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  {g.id === current && <span className="shrink-0 whitespace-nowrap text-xs text-stone-500">อยู่ที่นี่</span>}
                </label>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 border-t border-stone-100 bg-stone-50/60 px-6 py-3">
            <button type="button" onClick={onClose} className={`${ui.btnSecondary} !rounded-lg`}>ยกเลิก</button>
            <button type="submit" disabled={busy || !picked || picked === current} className={`${ui.btnPrimary} !rounded-lg`}>ย้าย</button>
          </div>
        </form>
      </div>
    </div>
  )
}
