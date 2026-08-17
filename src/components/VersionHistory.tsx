import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Company, FormColumn, FormSettings, SubmissionVersion } from '../types/schema'
import { listVersions } from '../data/versions'
import { describeChanges } from '../shared/versionDiff'
import { formatDateTime } from '../shared/date'
import ExpenseClaimPreview from '../features/expense-claim/ExpenseClaimPreview'

interface Props {
  submissionId: string
  columns: FormColumn[]
  settings: FormSettings
  company: Company | null
  refreshKey: number
  canRestore: boolean
  onRestore: (v: SubmissionVersion) => void
}

export default function VersionHistory({ submissionId, columns, settings, company, refreshKey, canRestore, onRestore }: Props) {
  const [versions, setVersions] = useState<SubmissionVersion[]>([])
  const [viewing, setViewing] = useState<SubmissionVersion | null>(null)

  useEffect(() => { listVersions(submissionId).then(setVersions) }, [submissionId, refreshKey])
  if (versions.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-[15px] font-semibold text-gray-900">ประวัติการแก้ไข ({versions.length} เวอร์ชัน)</h2>
      <ol className="space-y-3">
        {versions.map((v, idx) => {
          const older = versions[idx + 1] // list is newest-first, so the next item is the previous version
          const changes = older ? describeChanges(older, v, columns) : ['สร้างเอกสาร']
          const isLatest = idx === 0
          return (
            <li key={v.id} className="border-l-2 border-gray-200 pl-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold text-gray-900">เวอร์ชัน {v.version}</span>
                {isLatest && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">ล่าสุด</span>}
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">{formatDateTime(v.editedAt)}</span>
                {v.editedByName && <><span className="text-gray-300">·</span><span className="text-gray-500">โดย {v.editedByName}</span></>}
                <span className="ml-auto flex gap-3">
                  <button className="text-blue-600 hover:underline" onClick={() => setViewing(v)}>ดู</button>
                  {canRestore && !isLatest && <button className="text-gray-700 hover:underline" onClick={() => onRestore(v)}>กู้คืน</button>}
                </span>
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-gray-600">
                {changes.length ? changes.map((c, i) => <li key={i}>{c}</li>) : <li className="text-gray-400">ไม่มีการเปลี่ยนแปลง</li>}
              </ul>
            </li>
          )
        })}
      </ol>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4 sm:p-6" onClick={() => setViewing(null)}>
          <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-white">
              <span className="text-sm">ดูเวอร์ชัน {viewing.version} · {formatDateTime(viewing.editedAt)}</span>
              <button className="inline-flex items-center gap-1 rounded bg-white/20 px-3 py-1 text-sm hover:bg-white/30" onClick={() => setViewing(null)}><X size={14} /> ปิด</button>
            </div>
            <ExpenseClaimPreview company={company} header={viewing.header} items={viewing.items} docNumber="" settings={settings} />
          </div>
        </div>
      )}
    </div>
  )
}
