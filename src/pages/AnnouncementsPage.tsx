import { useEffect } from 'react'
import { Info, Megaphone } from 'lucide-react'
import { PageHeader, ui } from '../components/ui'
import { formatIsoDate } from '../shared/date'
import {
  ANNOUNCEMENTS, KIND_LABEL, KIND_STYLE, latestAnnouncementDate,
  lastSeenAnnouncement, markAnnouncementsSeen,
} from '../shared/announcements'

// What has changed in the system, newest first. Reading the page is what marks
// it read, so the dot on the menu goes out by itself.
export default function AnnouncementsPage() {
  // Read before the page marks itself read, so the newest entry can still be
  // shown as the one that was waiting.
  const seen = lastSeenAnnouncement()
  const latest = latestAnnouncementDate()
  useEffect(() => { markAnnouncementsSeen() }, [])

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={<Megaphone size={20} />}
        title="ประกาศ"
        subtitle="สิ่งที่เพิ่มเข้ามาและสิ่งที่แก้ไขในระบบ"
      />

      <div className="space-y-5">
        {ANNOUNCEMENTS.map(a => (
          <section key={a.date} className={ui.card}>
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <h2 className={ui.cardTitle}>{a.title}</h2>
              {a.date === latest && seen < latest && (
                <span className="rounded-full bg-clay-600 px-2 py-0.5 text-[11px] font-medium text-white">ใหม่</span>
              )}
              <span className="ml-auto text-xs text-stone-400">{formatIsoDate(a.date)}</span>
            </div>

            {a.note && (
              <p className="mb-4 flex items-start gap-2 rounded-xl bg-ochre-50 px-3 py-2.5 text-xs leading-relaxed text-ochre-700">
                <Info size={14} className="mt-0.5 shrink-0" />
                {a.note}
              </p>
            )}

            <ul className="space-y-2.5">
              {a.items.map((item, i) => (
                <li key={i} className="flex flex-wrap items-start gap-2 text-sm leading-relaxed text-stone-700">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${KIND_STYLE[item.kind]}`}>
                    {KIND_LABEL[item.kind]}
                  </span>
                  <span className="min-w-0 flex-1">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {ANNOUNCEMENTS.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center text-sm text-stone-500">
            ยังไม่มีประกาศ
          </div>
        )}
      </div>
    </div>
  )
}
