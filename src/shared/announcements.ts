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
    date: '2026-10-21',
    title: 'ตารางในหน้ากรอกมีขนาดเท่ากับเอกสารที่พิมพ์',
    items: [
      { kind: 'better', text: 'แต่ละคอลัมน์ในตารางรายการกว้างเท่ากับบนกระดาษ และใช้ตัวอักษรแบบเดียวกัน ข้อความยาวจะขึ้นบรรทัดใหม่ตรงคำเดียวกับเอกสารที่พิมพ์ออกมา' },
      { kind: 'new', text: 'ลากเส้นแบ่งระหว่างหัวคอลัมน์เพื่อขยายคอลัมน์ได้ (คอลัมน์ถัดไปจะแคบลงเท่ากัน) ขนาดที่ลากจำไว้กับเอกสารฉบับนั้นและพิมพ์ออกมาตามนั้น กด "คืนความกว้างคอลัมน์ตามฟอร์ม" เพื่อกลับเป็นค่าเดิม' },
      { kind: 'fix', text: 'ขึ้นบรรทัดใหม่ในช่องรายละเอียดแล้ว เอกสารที่พิมพ์ก็ขึ้นบรรทัดใหม่ตามด้วย' },
    ],
  },
  {
    date: '2026-10-19',
    title: 'ลายเซ็นของคุณติดไปกับเอกสารตั้งแต่ตอนบันทึก',
    items: [
      { kind: 'better', text: 'ถ้าอัปโหลดลายเซ็นไว้แล้ว กด "บันทึกและพิมพ์" ระบบจะใส่ลายเซ็นของคุณในช่องผู้จัดทำเอกสารให้เลย ช่องอื่นเว้นไว้ให้หัวหน้าเซ็นด้วยปากกา — ไม่ต้องไปส่งเซ็นให้ตัวเองที่หน้าประวัติ (ไม่อยากใส่ ให้เอาติ๊กออกก่อนกด)' },
      { kind: 'better', text: 'ต้องแก้เอกสารที่มีลายเซ็นของคุณแล้ว กด "แก้ไขเอกสาร" ที่แถบด้านบนของฟอร์มได้เลย แก้เสร็จกดบันทึกและพิมพ์ ลายเซ็นจะใส่ให้ใหม่' },
      { kind: 'better', text: 'สถานะ "เสร็จสิ้น" เปลี่ยนเป็น "บันทึกแล้ว" และเอกสารที่มีแค่ลายเซ็นของผู้เบิกขึ้นว่า "ผู้เบิกเซ็นแล้ว"' },
      { kind: 'better', text: 'ปุ่ม "ส่งให้เซ็น" ในหน้าประวัติเปลี่ยนเป็น "เซ็น / ส่งเซ็น" — ลืมใส่ลายเซ็นตอนบันทึก ก็มาเซ็นย้อนหลังที่นี่ได้ และเลือกคนที่จะเซ็นออนไลน์ในช่องอื่นได้ในหน้าต่างเดียวกัน ช่องที่ไม่เลือกใครจะเว้นไว้เซ็นบนกระดาษ' },
      { kind: 'better', text: 'ปุ่มในหน้าประวัติจัดใหม่: แก้ไข / พิมพ์ / คัดลอก อยู่กลุ่มเดียวกัน ส่วนลบเอกสารและยกเลิกการส่งเซ็นอยู่ในเมนู ⋯' },
    ],
  },
  {
    date: '2026-10-16',
    title: 'บันทึกและพิมพ์ในปุ่มเดียว · หักค่าประกันงานเฉพาะรายการที่เลือกได้',
    items: [
      { kind: 'better', text: 'ปุ่ม "บันทึก" และ "พิมพ์" รวมเป็นปุ่มเดียว "บันทึกและพิมพ์" — กดแล้วระบบบันทึกเอกสารเข้าประวัติก่อน แล้วจึงเปิดหน้าพิมพ์ เอกสารที่พิมพ์ทุกฉบับจึงมีเลขที่และอยู่ในประวัติเสมอ (ถ้าต้องการไฟล์ PDF เลือกปลายทางเป็น "Save as PDF")' },
      { kind: 'new', text: 'ค่าประกันงานเลือกได้ว่าจะหักจาก "ทั้งเอกสาร" หรือ "บางรายการ" — แบบบางรายการ ให้แต่ละรายการเลือกอัตราของตัวเองในคอลัมน์ "ประกันงาน" (ไม่หัก · 5% · 10% · อื่นๆ) เหมือนหัก ณ ที่จ่าย ยอดสรุปและเอกสารที่พิมพ์แยกตามอัตรา' },
    ],
  },
  {
    date: '2026-10-14',
    title: 'คิด VAT และหัก ณ ที่จ่ายเป็นรายการได้',
    items: [
      { kind: 'new', text: 'VAT และหัก ณ ที่จ่ายเลือกได้ว่าจะคิดจาก "ทุกรายการ" หรือ "เลือกรายการ" — ค่าเริ่มต้นยังเป็นทุกรายการเหมือนเดิม' },
      { kind: 'new', text: 'หัก ณ ที่จ่ายแบบเลือกรายการ ให้แต่ละรายการเลือกอัตราของตัวเองได้ (ไม่หัก · 1% · 2% · 3% · 5% · อื่นๆ) ยอดสรุปแยกตามอัตรา และเอกสารที่พิมพ์แสดงอัตราของแต่ละรายการ' },
      { kind: 'new', text: 'VAT แบบเลือกรายการ ติ๊กเฉพาะรายการที่มีใบกำกับภาษี' },
    ],
  },
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
