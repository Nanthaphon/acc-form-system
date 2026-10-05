// The employee manual: the training deck, one image per slide, served from
// public/guide/ (rendered from the deck, company logos included). The titles
// here are what the table of contents shows and the images' alt text.

export interface ManualSlide { title: string }
export interface ManualPart { title: string; slides: ManualSlide[] }

export const MANUAL_PARTS: ManualPart[] = [
  { title: 'เริ่มต้น', slides: [
    { title: 'Acc Documents คู่มือการใช้งาน' },
    { title: 'ภาพรวมการใช้งาน 5 ขั้นตอน' },
  ] },
  { title: '1 · เริ่มต้นใช้งาน', slides: [
    { title: 'ส่วนที่ 1 เริ่มต้นใช้งาน' },
    { title: 'เข้าสู่ระบบ' },
    { title: 'ครั้งแรก: ตั้งรหัสผ่านใหม่' },
    { title: 'ตรวจข้อมูลของฉัน และอัปโหลดลายเซ็น' },
    { title: 'รู้จักเมนูหลัก' },
  ] },
  { title: '2 · กรอกและบันทึกเอกสาร', slides: [
    { title: 'ส่วนที่ 2 กรอกและบันทึกเอกสาร' },
    { title: 'เลือกฟอร์มที่จะใช้' },
    { title: 'กรอกส่วนหัวของเอกสาร' },
    { title: 'กรอกรายการ ระบบคำนวณให้' },
    { title: 'แนบหลักฐาน แล้วกดบันทึก' },
    { title: 'ดูตัวอย่างก่อนพิมพ์' },
    { title: 'พิมพ์ หรือบันทึกเป็น PDF' },
  ] },
  { title: '3 · ส่งเซ็นออนไลน์และติดตามสถานะ', slides: [
    { title: 'ส่วนที่ 3 ส่งเซ็นออนไลน์และติดตามสถานะ' },
    { title: 'หน้าประวัติ: เอกสารทั้งหมดของฉัน' },
    { title: 'สถานะของเอกสาร' },
    { title: 'ส่งเอกสารให้หัวหน้าเซ็น' },
    { title: 'เมื่อมีคนส่งเอกสารมาให้คุณเซ็น' },
    { title: 'ยืนยันการเซ็น' },
    { title: 'ยังเซ็นไม่ได้? อัปโหลดลายเซ็นก่อน' },
    { title: 'แก้ไขเอกสาร และประวัติการแก้ไข' },
  ] },
  { title: 'ปิดท้าย', slides: [
    { title: 'ปัญหาที่พบบ่อย' },
    { title: 'สรุป' },
  ] },
]

export const MANUAL_SLIDES: ManualSlide[] = MANUAL_PARTS.flatMap(p => p.slides)
export const MANUAL_PDF = '/guide/acc-documents-manual.pdf'

// Slide n (1-based) → its image, e.g. /guide/slide-05.webp
export function manualSlideSrc(n: number): string {
  return `/guide/slide-${String(n).padStart(2, '0')}.webp`
}

// The page asked for in the address (?p=5), kept inside the deck.
export function clampSlide(raw: string | null | undefined): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, MANUAL_SLIDES.length)
}
