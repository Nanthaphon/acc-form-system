// The two user manuals — one for employees, one for admins — each the
// training deck as one image per slide, served from public/guide/ (rendered
// from the decks, company logos included). The titles here are what the
// contents list shows and the images' alt text.

export interface ManualSlide {
  title: string
  divider?: boolean   // a part's title slide: the contents list shows it as the part, not as a topic
}
export interface ManualPart {
  title: string
  num?: number        // numbered parts; the intro and the closing part carry none
  slides: ManualSlide[]
}
export interface Manual {
  key: 'employee' | 'admin'
  label: string       // the tab
  audience: string    // under the page title
  dir: string         // where the slide images live
  pdf: string
  pdfName: string     // the downloaded file's name
  parts: ManualPart[]
}

export const EMPLOYEE_MANUAL: Manual = {
  key: 'employee',
  label: 'คู่มือพนักงาน',
  audience: 'สำหรับพนักงาน',
  dir: '/guide',
  pdf: '/guide/acc-documents-manual.pdf',
  pdfName: 'คู่มือ Acc Documents สำหรับพนักงาน.pdf',
  parts: [
    { title: 'แนะนำ', slides: [
      { title: 'Acc Documents คู่มือการใช้งาน' },
      { title: 'ภาพรวมการใช้งาน 5 ขั้นตอน' },
    ] },
    { title: 'เริ่มต้นใช้งาน', num: 1, slides: [
      { title: 'ส่วนที่ 1 เริ่มต้นใช้งาน', divider: true },
      { title: 'เข้าสู่ระบบ' },
      { title: 'ครั้งแรก: ตั้งรหัสผ่านใหม่' },
      { title: 'ตรวจข้อมูลของฉัน และอัปโหลดลายเซ็น' },
      { title: 'รู้จักเมนูหลัก' },
    ] },
    { title: 'กรอกและบันทึกเอกสาร', num: 2, slides: [
      { title: 'ส่วนที่ 2 กรอกและบันทึกเอกสาร', divider: true },
      { title: 'เลือกฟอร์มที่จะใช้' },
      { title: 'กรอกส่วนหัวของเอกสาร' },
      { title: 'กรอกรายการ ระบบคำนวณให้' },
      { title: 'แนบหลักฐาน แล้วกดบันทึก' },
      { title: 'ดูตัวอย่างก่อนพิมพ์' },
      { title: 'พิมพ์ หรือบันทึกเป็น PDF' },
    ] },
    { title: 'ส่งเซ็นออนไลน์และติดตามสถานะ', num: 3, slides: [
      { title: 'ส่วนที่ 3 ส่งเซ็นออนไลน์และติดตามสถานะ', divider: true },
      { title: 'หน้าประวัติ: เอกสารทั้งหมดของฉัน' },
      { title: 'สถานะของเอกสาร' },
      { title: 'ส่งเอกสารให้หัวหน้าเซ็น' },
      { title: 'เมื่อมีคนส่งเอกสารมาให้คุณเซ็น' },
      { title: 'ยืนยันการเซ็น' },
      { title: 'ยังเซ็นไม่ได้? อัปโหลดลายเซ็นก่อน' },
      { title: 'แก้ไขเอกสาร และประวัติการแก้ไข' },
    ] },
    { title: 'ถาม-ตอบและสรุป', slides: [
      { title: 'ปัญหาที่พบบ่อย' },
      { title: 'สรุป' },
    ] },
  ],
}

export const ADMIN_MANUAL: Manual = {
  key: 'admin',
  label: 'คู่มือผู้ดูแลระบบ',
  audience: 'สำหรับผู้ดูแลระบบ',
  dir: '/guide/admin',
  pdf: '/guide/admin/acc-documents-admin-manual.pdf',
  pdfName: 'คู่มือ Acc Documents สำหรับผู้ดูแลระบบ.pdf',
  parts: [
    { title: 'แนะนำ', slides: [
      { title: 'Acc Documents คู่มือผู้ดูแลระบบ' },
      { title: 'ผู้ดูแลระบบมี 2 ระดับ' },
      { title: 'เมนูของผู้ดูแลระบบ' },
    ] },
    { title: 'จัดการพนักงาน', num: 1, slides: [
      { title: 'ส่วนที่ 1 จัดการพนักงาน', divider: true },
      { title: 'หน้าข้อมูลพนักงาน' },
      { title: 'เพิ่มพนักงานใหม่' },
      { title: 'นำเข้าพนักงานหลายคนจาก Excel' },
      { title: 'ข้อมูลพนักงานรายคน' },
      { title: 'พนักงานลืมรหัสผ่าน: ตั้งรหัสใหม่' },
      { title: 'แก้ชื่อผู้ใช้ (เฉพาะ Super Admin)' },
    ] },
    { title: 'ฟอร์มและโฟลเดอร์', num: 2, slides: [
      { title: 'ส่วนที่ 2 ฟอร์มและโฟลเดอร์', divider: true },
      { title: 'จัดการฟอร์มในโฟลเดอร์' },
      { title: 'ข้อมูลทั่วไปของฟอร์ม' },
      { title: 'คอลัมน์ตาราง และการคำนวณ' },
      { title: 'ข้อความในเอกสาร และช่องลายเซ็น' },
    ] },
    { title: 'สิทธิ์และตัวเลือก', num: 3, slides: [
      { title: 'ส่วนที่ 3 สิทธิ์และตัวเลือก', divider: true },
      { title: 'จัดการสิทธิ์เข้าถึงฟอร์ม' },
      { title: 'Custom Field: ตัวเลือกแผนกและตำแหน่ง' },
    ] },
    { title: 'เอกสารทั้งระบบ', num: 4, slides: [
      { title: 'ส่วนที่ 4 เอกสารทั้งระบบ', divider: true },
      { title: 'ประวัติพิมพ์ทั้งหมดในระบบ' },
      { title: 'เซ็นเอกสารของตัวเองได้ทันที' },
    ] },
    { title: 'ถาม-ตอบและสรุป', slides: [
      { title: 'ปัญหาที่พบบ่อย' },
      { title: 'สรุป' },
    ] },
  ],
}

export function manualSlides(m: Manual): ManualSlide[] {
  return m.parts.flatMap(p => p.slides)
}

// Slide n (1-based) → its image, e.g. /guide/admin/slide-05.webp
export function manualSlideSrc(m: Manual, n: number): string {
  return `${m.dir}/slide-${String(n).padStart(2, '0')}.webp`
}

// The page asked for in the address (?p=5), kept inside the deck.
export function clampSlide(raw: string | null | undefined, total: number): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, total)
}

// Each part with the slide numbers it covers, for the contents list.
export interface PartRange extends ManualPart { first: number; last: number }
export function partRanges(m: Manual): PartRange[] {
  let next = 1
  return m.parts.map(p => {
    const first = next
    next += p.slides.length
    return { ...p, first, last: next - 1 }
  })
}
