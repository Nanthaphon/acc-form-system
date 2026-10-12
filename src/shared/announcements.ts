// What changed in the system, announced to everyone who uses it. The list is
// part of the app rather than something kept in the database: an entry is
// written when the change itself is written, and goes live with it, so the
// announcement can never be forgotten or describe a version nobody has yet.
//
// To announce a change: add an entry at the TOP of ANNOUNCEMENTS, dated the
// day it goes live. Write for the people filling the forms in — what they can
// now do, not what the code does.
export type ChangeKind = 'new' | 'fix' | 'better'

export const KIND_LABEL: Record<ChangeKind, string> = {
  new: 'เพิ่มใหม่',
  fix: 'แก้ไข',
  better: 'ปรับปรุง',
}
export const KIND_STYLE: Record<ChangeKind, string> = {
  new: 'bg-clay-50 text-clay-700 ring-clay-200',
  fix: 'bg-rose-50 text-rose-600 ring-rose-200',
  better: 'bg-ochre-50 text-ochre-700 ring-ochre-200',
}

export interface Announcement {
  date: string            // 'yyyy-mm-dd', the day it went live
  title: string
  note?: string           // anything to do before it can be used
  items: { kind: ChangeKind; text: string }[]
}

// Newest first.
export const ANNOUNCEMENTS: Announcement[] = [
  {
    date: '2026-10-12',
    title: 'ขนาดตัวอักษร · ปฏิทินใหม่ · เอกสารใส่รายการได้มากขึ้น',
    note: 'การติ๊ก "ไม่แสดงคอลัมน์ลำดับ" ต้องให้ผู้ดูแลระบบอัปเดตฐานข้อมูลก่อน จึงจะบันทึกค่าไว้ได้',
    items: [
      { kind: 'new', text: 'ปรับขนาดตัวอักษรในช่องกรอกได้ เล็ก / ปกติ / ใหญ่ จำไว้กับเอกสารฉบับนั้น' },
      { kind: 'new', text: 'ติ๊กไม่แสดงคอลัมน์ "ลำดับ" ในฟอร์มได้ เพื่อเพิ่มพื้นที่ให้คอลัมน์อื่น' },
      { kind: 'new', text: 'ปฏิทินเลือกวันที่แบบใหม่ เดือนและวันเป็นภาษาไทย ใหญ่ขึ้น เลือกปีจากตารางได้ และกดที่ช่องตรงไหนก็เปิดได้ ไม่ต้องกดที่ไอคอน' },
      { kind: 'better', text: 'ช่องข้อความขยายเองตามที่พิมพ์ ไม่ต้องลากขอบ ทั้งในตารางกรอกและในหน้าแก้ไขฟอร์มของผู้ดูแลระบบ' },
      { kind: 'better', text: 'เอกสารที่พิมพ์ออกมาไม่มีกรอบครอบแล้ว พื้นที่ตารางกว้างขึ้นเป็น 190 มม. ใส่รายละเอียดได้มากขึ้น' },
      { kind: 'fix', text: 'เอกสารไม่ตัดขึ้นหน้าใหม่ทั้งที่ยังมีที่ว่าง — จำนวนแถวต่อแผ่นคิดจากความสูงจริงของแต่ละแถว' },
      { kind: 'fix', text: 'ไม่มีแถวว่างเปล่าต่อท้ายตารางในเอกสารอีกแล้ว' },
      { kind: 'fix', text: 'ช่องจำนวนเงินขึ้น 0.00 ทั้งที่กรอก "วันละ" ไว้แล้ว' },
      { kind: 'fix', text: 'ช่องตัวเลขไม่มีเลข 0 ใส่มาให้ล่วงหน้าแล้ว' },
    ],
  },
]

// The system remembers in this browser which announcement was last read, so a
// new one can mark itself on the menu without a trip to the database.
const SEEN_KEY = 'announcements:seen'
export const ANNOUNCEMENTS_SEEN_EVENT = 'announcements:seen'

export function latestAnnouncementDate(): string {
  return ANNOUNCEMENTS[0]?.date ?? ''
}

export function lastSeenAnnouncement(): string {
  try { return localStorage.getItem(SEEN_KEY) ?? '' } catch { return '' }   // storage can be blocked
}

export function hasUnreadAnnouncement(): boolean {
  const latest = latestAnnouncementDate()
  return !!latest && lastSeenAnnouncement() < latest
}

export function markAnnouncementsSeen(): void {
  try { localStorage.setItem(SEEN_KEY, latestAnnouncementDate()) } catch { /* nothing to do about it */ }
  window.dispatchEvent(new Event(ANNOUNCEMENTS_SEEN_EVENT))
}
