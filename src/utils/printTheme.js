/* ── สีสำหรับไฟล์ที่พิมพ์ออก (ธีม v4 "Harbor") ────────────────────

   หน้าพิมพ์เปิดใน window ใหม่ที่ไม่มี Tailwind และไม่มี CSS variable
   ของแอป จึงต้องเขียนค่าสีตรง ๆ ไฟล์นี้คือที่เดียวที่เก็บค่าเหล่านั้น
   ค่าทั้งหมดคัดลอกมาจาก @theme ใน src/index.css — แก้ธีมเมื่อไหร่ให้แก้ที่นี่ด้วย

   เดิมไฟล์ print แต่ละตัวเขียนสีของตัวเองปนกัน (slate ของ Tailwind
   กับ teal ของแบรนด์) เอกสารที่พิมพ์ออกจึงดูคนละชุดกับหน้าจอ
   และป้ายสถานะก็คนละสีกับในระบบ                                        */

export const P = {
  brand:      '#2B6777',   // clay-600
  brandDark:  '#225462',   // clay-700
  brandPale:  '#C8D8E4',   // clay-200
  surface:    '#F7F9FA',   // sand-50
  surfaceAlt: '#F2F2F2',   // sand-100
  ink:        '#162024',   // stone-900
  inkSoft:    '#374449',   // stone-700
  muted:      '#64757D',   // stone-500
  faint:      '#82959E',   // stone-400
  line:       '#E1E8EB',   // stone-200
  lineSoft:   '#EFF3F5',   // stone-100
  white:      '#FFFFFF',
};

/* โทนสถานะ — ต้องตรงกับ STATUS_TONE/TONE ใน src/ui/earth.js
   ถ้าเพิ่มสถานะใหม่ในระบบ ให้เพิ่มที่ earth.js แล้วมาเพิ่มที่นี่ด้วย */
const TONE = {
  ok:      { bg: '#EAF5F2', fg: '#2C5D53' },   // olive-50  / olive-700
  busy:    { bg: '#FBF3E4', fg: '#8A6520' },   // ochre-50  / ochre-700
  bad:     { bg: '#FBEAE8', fg: '#8F372F' },   // rose-50   / rose-700
  neutral: { bg: '#EFF3F5', fg: '#374449' },   // stone-100 / stone-700
  /* หน้าจอใช้ stone-400 ได้เพราะจอสว่างและซูมได้ แต่บนกระดาษที่ 9.5px
     stone-400 บน sand-100 = 2.78:1 อ่านแทบไม่ออก -> ขยับเป็น stone-600 (6.41:1)
     ยังเป็นโทนจางสุดในชุด แต่อ่านออกจริงตอนพิมพ์ */
  off:     { bg: '#F2F2F2', fg: '#4A5A61' },   // sand-100  / stone-600 — จางสุด (ตัดจำหน่าย)
};

const STATUS_TONE = {
  // ทรัพย์สิน
  'พร้อมใช้งาน': 'ok',
  'ถูกใช้งาน': 'neutral',
  'สำรอง': 'neutral',
  'ติดตั้งบนเครื่อง': 'neutral',
  'รอดำเนินการ': 'busy',
  'ชำรุดเสียหาย': 'bad',
  'ไม่สามารถใช้งานได้': 'bad',
  'ตัดจำหน่าย': 'off',
  // สต็อกอุปกรณ์สำนักงาน
  'ปกติ': 'ok',
  'ใกล้หมด': 'busy',
  'หมดสต็อก': 'bad',
  // งานแจ้งซ่อม / คำขอ
  'กำลังดำเนินการ': 'busy',
  'ซ่อมเสร็จสิ้น': 'ok',
  'เสร็จสิ้น': 'ok',
  'อนุมัติ': 'ok',
  'ยกเลิก': 'off',
  'ปฏิเสธ': 'bad',
};

export const toneOf = (status) => TONE[STATUS_TONE[String(status || '').trim()] ?? 'neutral'];

/**
 * ป้ายสถานะสำหรับหน้าพิมพ์ — พื้นอ่อน ไม่มีขอบ ตามกฎ badge ของธีม
 * @param {string} status
 * @param {object} [opts]
 * @param {number} [opts.fontSize]
 * @param {string} [opts.label]   ข้อความที่จะแสดง (ใช้ชื่อย่อได้ แต่สียังอิงสถานะจริง)
 */
export function statusChip(status, { fontSize = 9, label } = {}) {
  const s = String(status || '').trim();
  if (!s) return '<span style="color:' + P.faint + '">–</span>';
  const t = toneOf(s);
  const esc = String(label ?? s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return '<span style="display:inline-block;font-size:' + fontSize + 'px;font-weight:500;'
    + 'padding:2px 6px;border-radius:5px;background:' + t.bg + ';color:' + t.fg + ';'
    + 'line-height:1.3;max-width:100%;overflow-wrap:anywhere">' + esc + '</span>';
}
