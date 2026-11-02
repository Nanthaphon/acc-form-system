import { Pencil, Trash2 } from 'lucide-react'
import FolderCardIcon from './FolderCardIcon'
import ActionIconButton from './ActionIconButton'
import Switch from './Switch'

interface Props {
  name: string
  count: number          // forms inside, sub-folders' included
  active: boolean
  isAdmin: boolean
  noun: 'กลุ่ม' | 'โฟลเดอร์'   // how the admin's buttons name it
  onOpen: () => void
  onToggle: () => void
  onRename: () => void
  onDelete: () => void
}

// A folder as the first page shows it — the same card for a folder there and
// for a sub-folder inside one, so the two read as the same kind of thing.
export default function FolderCard({ name, count, active, isAdmin, noun, onOpen, onToggle, onRename, onDelete }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className={`relative cursor-pointer rounded-xl border border-stone-200 bg-white p-6 text-center transition hover:border-stone-300 hover:shadow-md ${isAdmin && !active ? 'opacity-60' : ''}`}
    >
      <FolderCardIcon count={count} />
      <div className="mt-3 truncate font-medium text-stone-900" title={name}>{name}</div>
      <div className="text-sm text-stone-500">{count} ฟอร์ม</div>
      {isAdmin && (
        <div className="mt-3 flex items-center justify-center gap-2" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
          <Switch on={active} onChange={onToggle} />
          <span className={`text-xs font-medium ${active ? 'text-olive-600' : 'text-stone-400'}`}>{active ? 'เปิด' : 'ปิด'}</span>
        </div>
      )}
      {isAdmin && (
        <div className="absolute right-2 top-2 flex gap-1">
          <ActionIconButton label={`เปลี่ยนชื่อ${noun}`} icon={<Pencil size={16} />}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onRename() }} />
          <ActionIconButton label={`ลบ${noun}`} tone="red" icon={<Trash2 size={16} />}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete() }} />
        </div>
      )}
    </div>
  )
}
