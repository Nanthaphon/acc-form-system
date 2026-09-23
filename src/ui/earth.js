/* ════════════════════════════════════════════════════════════════
   Earth Tone Design Tokens (ธีม v3 — Minimalist & Clean)
   โทนน้ำตาล/เบจ · พื้นที่ว่างเยอะ · เงาบางมาก · สีใช้เฉพาะที่สื่อความหมาย

   ⚠️ ไฟล์นี้คือแหล่งเดียวของสีและโทเคน — ห้าม hardcode สีซ้ำในคอมโพเนนต์
   เมนูที่ทยอย redesign ให้ import จากที่นี่เท่านั้น
   ════════════════════════════════════════════════════════════════ */

/* ── พื้นผิว ─────────────────────────────────────────────────── */
export const surface = {
  /* พื้นหน้าจอ — ครีมอมเบจ ไม่ใช่ขาวจ้า */
  page:     'bg-sand-50',
  /* การ์ดมาตรฐาน — มุมมน เงาบางมาก ขอบจาง */
  card:     'bg-white rounded-2xl border border-stone-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
  /* กล่องย่อยภายในการ์ด — ไม่มีเงา ใช้พื้นที่ว่างแบ่งแทน */
  inset:    'bg-stone-50/70 rounded-xl',
  divider:  'border-stone-200/60',
};

/* ── ตัวอักษร ────────────────────────────────────────────────── */
export const text = {
  h1:     'text-[22px] font-medium tracking-tight text-stone-900',
  h2:     'text-[15px] font-medium text-stone-900',
  body:   'text-sm text-stone-700',
  muted:  'text-sm text-stone-500',
  faint:  'text-[13px] text-stone-400',
  accent: 'text-clay-600',
  /* ตัวเลขสรุปบนการ์ด metric — ไม่ผูกสีไว้ ให้ผู้เรียกกำหนดเอง
     (ถ้าใส่สีไว้ที่นี่ จะชนกับสี accent ที่ส่งทับ เพราะ Tailwind ตัดสิน
      ด้วยลำดับใน stylesheet ไม่ใช่ลำดับใน className) */
  metric: 'text-3xl font-medium tracking-tight tabular-nums',
  label:  'text-[13px] text-stone-500',
};

/* ── ปุ่ม ────────────────────────────────────────────────────── */
export const button = {
  primary: 'inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-clay-700',
  ghost:   'inline-flex items-center gap-2 rounded-xl border border-stone-200/60 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900',
  icon:    'inline-flex size-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700',
};

/* ── สถานะ ───────────────────────────────────────────────────
   สีอ่อน ซอฟต์ ไม่มีพื้นทึบ · คุมให้เหลือแค่ 4 ความหมาย
   ok = ใช้ได้ · busy = กำลังดำเนินการ · bad = ต้องดูแล · off = พ้นการใช้งาน
   ─────────────────────────────────────────────────────────── */
const TONE = {
  ok:      { badge: 'bg-olive-50 text-olive-700',     dot: 'bg-olive-600',  bar: 'bg-olive-600/70'  },
  busy:    { badge: 'bg-ochre-50 text-ochre-700',     dot: 'bg-ochre-600',  bar: 'bg-ochre-600/70'  },
  bad:     { badge: 'bg-rose-50 text-rose-700',       dot: 'bg-brick-500',    bar: 'bg-brick-600/70'    },
  neutral: { badge: 'bg-sand-100 text-stone-600',     dot: 'bg-sand-300',   bar: 'bg-stone-500/60'   },
  off:     { badge: 'bg-sand-100 text-stone-400',     dot: 'bg-sand-300',   bar: 'bg-sand-300'      },
};

/* map สถานะจริงในฐานข้อมูล -> โทน (ค่าที่ไม่รู้จักตกเป็น neutral) */
const STATUS_TONE = {
  // ทรัพย์สิน
  'พร้อมใช้งาน': 'ok',
  'ถูกใช้งาน': 'neutral',
  'สำรอง': 'neutral',
  'ติดตั้งบนเครื่อง': 'neutral',   // License ผูกกับเครื่อง ไม่ได้จ่ายให้คน
  'รอดำเนินการ': 'busy',
  'ชำรุดเสียหาย': 'bad',
  'ไม่สามารถใช้งานได้': 'bad',
  'ตัดจำหน่าย': 'off',
  // สต็อกอุปกรณ์สำนักงาน
  'ปกติ': 'ok',
  'ใกล้หมด': 'busy',
  'หมดสต็อก': 'bad',
  // งานแจ้งซ่อม
  'กำลังดำเนินการ': 'busy',
  'เสร็จสิ้น': 'ok',
  'ยกเลิก': 'off',
};

export function statusTone(status) {
  return TONE[STATUS_TONE[String(status || '').trim()] ?? 'neutral'];
}

/* ── ตัวช่วยจัดรูปแบบตัวเลข ─────────────────────────────────── */
export const fmt = {
  num:  (v) => Number(v || 0).toLocaleString('th-TH'),
  /* มูลค่าบนการ์ด metric — ย่อให้อ่านแวบเดียว ไม่ให้ตัวเลขยาวจนล้น */
  money: (v) => {
    const n = Number(v || 0);
    if (n >= 1e6) return `฿${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `฿${Math.round(n / 1e3)}K`;
    return `฿${n.toLocaleString('th-TH')}`;
  },
  moneyFull: (v) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })
      .format(Number(v || 0)),
};
