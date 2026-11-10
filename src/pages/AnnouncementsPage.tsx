import { useEffect } from 'react'
import { Bug, Info, Megaphone, Sparkles, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader, ui } from '../components/ui'
import { formatIsoDate } from '../shared/date'
import {
  ANNOUNCEMENTS, KIND_HEADING, KIND_ORDER, latestAnnouncementDate,
  lastSeenAnnouncement, markAnnouncementsSeen,
} from '../shared/announcements'
import type { ChangeKind } from '../shared/announcements'

const KIND_ICON: Record<ChangeKind, ReactNode> = {
  new: <Sparkles size={15} className="text-clay-600" />,
  better: <TrendingUp size={15} className="text-ochre-600" />,
  fix: <Bug size={15} className="text-brick-600" />,
}
const KIND_DOT: Record<ChangeKind, string> = {
  new: 'bg-clay-500',
  better: 'bg-ochre-500',
  fix: 'bg-brick-500',
}

// What has changed in the system, release by release, newest first — like an
// app's update notes. Each release lists its changes under เพิ่มใหม่ /
// ปรับปรุง / แก้ไขข้อผิดพลาด. Reading the page is what marks it read, so the
// dot on the menu goes out by itself.
export default function AnnouncementsPage() {
  // Read before the page marks itself read, so the newest entry can still be
  // shown as the one that was waiting.
  const seen = lastSeenAnnouncement()
  const latest = latestAnnouncementDate()
  useEffect(() => { markAnnouncementsSeen() }, [])

  return (
    <div>
      <PageHeader
        icon={<Megaphone size={20} />}
        title="ประกาศ"
        subtitle="อัปเดตของระบบในแต่ละเวอร์ชัน"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Every release at a glance; a click jumps to it. */}
        <nav aria-label="เวอร์ชัน" className={`${ui.card} hidden !p-3 lg:sticky lg:top-6 lg:block`}>
          <p className="px-2 pb-2 text-xs font-medium text-stone-500">เวอร์ชันทั้งหมด</p>
          <ol className="space-y-0.5">
            {ANNOUNCEMENTS.map(a => (
              <li key={a.version}>
                <a href={`#v${a.version}`} className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-50">
                  <span className="font-semibold tabular-nums text-stone-900">v{a.version}</span>
                  <span className="text-xs tabular-nums text-stone-500">{formatIsoDate(a.date)}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-5">
          {ANNOUNCEMENTS.map(a => {
            const counts = KIND_ORDER.map(k => [k, a.items.filter(i => i.kind === k).length] as const).filter(([, n]) => n > 0)
            return (
              <section key={a.version} id={`v${a.version}`} className={`${ui.card} scroll-mt-6`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-lg bg-clay-600 px-2.5 py-1 text-sm font-semibold tabular-nums text-white">v{a.version}</span>
                  <h2 className="text-base font-semibold text-stone-900">{a.title}</h2>
                  {a.date === latest && seen < latest && (
                    <span className="rounded-full bg-ochre-50 px-2 py-0.5 text-[11px] font-medium text-ochre-700 ring-1 ring-ochre-200">ใหม่</span>
                  )}
                  <span className="ml-auto text-sm tabular-nums text-stone-500">{formatIsoDate(a.date)}</span>
                </div>
                <p className="mt-1.5 text-xs text-stone-500">
                  {counts.map(([k, n]) => `${KIND_HEADING[k]} ${n}`).join(' · ')}
                </p>

                {a.note && (
                  <p className="mt-4 flex items-start gap-2 rounded-lg bg-ochre-50 px-3 py-2.5 text-xs leading-relaxed text-ochre-700">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    {a.note}
                  </p>
                )}

                <div className="mt-4 grid gap-5 border-t border-stone-100 pt-4">
                  {KIND_ORDER.map(kind => {
                    const items = a.items.filter(i => i.kind === kind)
                    if (!items.length) return null
                    return (
                      <div key={kind}>
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800">
                          {KIND_ICON[kind]} {KIND_HEADING[kind]}
                        </h3>
                        <ul className="space-y-1.5">
                          {items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-stone-700">
                              <span className={`mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT[kind]}`} aria-hidden />
                              <span className="min-w-0 flex-1">
                                {item.text}
                                {item.admin && (
                                  <span className="ml-2 whitespace-nowrap rounded-md bg-stone-100 px-1.5 py-0.5 align-middle text-[11px] font-medium text-stone-600">ผู้ดูแลระบบ</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {ANNOUNCEMENTS.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center text-sm text-stone-500">
              ยังไม่มีประกาศ
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
