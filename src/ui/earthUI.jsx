import React, { useState } from 'react';
import { MoreHorizontal, Search, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { surface, text, button, statusTone } from './earth.js';
import useDismiss from './useDismiss.js';

/* ════════════════════════════════════════════════════════════════
   ชิ้นส่วนพื้นฐานของธีม v3 (Earth tone) — ใช้ซ้ำได้ทุกหน้า
   คู่กับ earth.js (token) · หน้าไหนจะ redesign ให้ import จากที่นี่
   ════════════════════════════════════════════════════════════════ */

/* ── การ์ด metric — ตัวเลขใหญ่ อ่านแวบเดียว ────────────────── */
export function MetricCard({ icon: Icon, label, value, hint, tone = 'default' }) {
  const accent = tone === 'accent';
  return (
    <div className={`${surface.card} p-6`}>
      <div className="flex items-start justify-between">
        <span className={text.label}>{label}</span>
        <Icon
          className={`size-5 shrink-0 ${accent ? 'text-clay-600' : 'text-stone-300'}`}
          strokeWidth={2}
        />
      </div>
      <div className={`mt-4 ${text.metric} ${accent ? 'text-clay-600' : 'text-stone-900'}`}>{value}</div>
      {hint && <div className={`mt-1.5 ${text.faint}`}>{hint}</div>}
    </div>
  );
}

/* ── การ์ดเนื้อหา — หัวข้อ + พื้นที่ว่าง ไม่มีเส้นคั่น ───────── */
export function Panel({ title, meta, action, children, className = '' }) {
  return (
    <section className={`${surface.card} p-6 ${className}`}>
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className={text.h2}>{title}</h2>
          {meta && <p className={`mt-0.5 ${text.faint}`}>{meta}</p>}
        </div>
        {action}
      </header>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/* ── ป้ายสถานะ — สีอ่อน ซอฟต์ ไม่มีพื้นทึบ ─────────────────── */
export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium ${statusTone(status).badge}`}>
      {status}
    </span>
  );
}

/* ── แถวสัดส่วน — ชื่อ + แท่งบาง + จำนวน ───────────────────── */
export function BarRow({ label, value, total, tone = 'neutral' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={`truncate ${text.body}`}>{label}</span>
        <span className="shrink-0 text-sm tabular-nums text-stone-500">
          {value.toLocaleString('th-TH')}
          <span className="ml-1.5 text-stone-300">{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── กล่องลอย — ฐานของเมนู "..." และตัวเลือกคอลัมน์ ─────────── */
export function Popover({ open, onClose, trigger, children, width = 'w-56', align = 'right' }) {
  const ref = useDismiss(open, onClose);
  return (
    <div ref={ref} className="relative shrink-0">
      {trigger}
      {open && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-20 mt-1 ${width} overflow-hidden ${surface.card} p-1.5`}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── เมนู "..." — ซ่อน action ที่ไม่ได้ใช้บ่อย ─────────────── */
export function ActionMenu({ items = [], label = 'ตัวเลือกเพิ่มเติม' }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <Popover
      open={open} onClose={() => setOpen(false)} width="w-48"
      trigger={
        <button
          type="button" onClick={() => setOpen(v => !v)} className={button.icon}
          aria-label={label} aria-haspopup="menu" aria-expanded={open}
        >
          <MoreHorizontal className="size-5" strokeWidth={2} />
        </button>
      }
    >
      <div role="menu">
        {items.map(({ key, label: itemLabel, onSelect, tone }) => (
          <button
            key={key} role="menuitem" type="button"
            onClick={() => { setOpen(false); onSelect?.(); }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-stone-50 ${
              tone === 'danger' ? 'text-rose-600 hover:bg-rose-50' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {itemLabel}
          </button>
        ))}
      </div>
    </Popover>
  );
}

/* ── เครื่องหมายติ๊กแบบไม่โต้ตอบ — ใช้ตอนที่ "ตัวแถว" เป็นปุ่มคลิกอยู่แล้ว
   (ถ้าใช้ Checkbox ที่เป็น <button> จะกลายเป็นปุ่มซ้อนปุ่ม ซึ่ง HTML ไม่อนุญาต) ── */
export function CheckMark({ checked }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
        checked ? 'border-clay-600 bg-clay-600 text-white' : 'border-stone-300 bg-white'
      }`}
    >
      {checked && <Check className="size-3" strokeWidth={2} />}
    </span>
  );
}

/* ── ช่องติ๊กที่กดได้เอง — ใช้ในตาราง ── */
export function Checkbox({ checked, onChange, label }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={!!checked} aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`inline-flex size-[18px] items-center justify-center rounded-md border transition-colors ${
        checked
          ? 'border-clay-600 bg-clay-600 text-white'
          : 'border-stone-300 bg-white hover:border-stone-400'
      }`}
    >
      {checked && <Check className="size-3" strokeWidth={2} />}
    </button>
  );
}

/* ── สถานะว่าง — เงียบ ไม่ตะโกน ─────────────────────────────── */
export function EmptyState({ children }) {
  return <p className={`py-10 text-center ${text.faint}`}>{children}</p>;
}

/* ════════════════════════════════════════════════════════════════
   ชิ้นส่วนสำหรับหน้า "รายการ" (ตาราง) — ใช้ซ้ำได้กับทุกเมนูที่เป็น list
   ════════════════════════════════════════════════════════════════ */

/* ── ช่องค้นหา ── */
export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" strokeWidth={2} />
      <input
        type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-stone-200/60 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-700 outline-none transition-colors placeholder:text-stone-400 focus:border-clay-600/40 focus:ring-2 focus:ring-clay-600/10 sm:w-72"
      />
    </div>
  );
}

/* ── เปลือกตาราง — หัวตารางไม่มีพื้นสี ใช้เส้นบางเส้นเดียวคั่น ──

   ความกว้างขั้นต่ำโตตามจำนวนคอลัมน์ที่เปิดอยู่
   ของเดิมตรึงไว้ที่ 720px พอผู้ใช้เปิดคอลัมน์เสริมหลายอัน ตารางไม่ยอมกว้างขึ้น
   เบราว์เซอร์เลยบีบแต่ละคอลัมน์จนข้อความตกบรรทัด
   ให้มันกว้างขึ้นแล้วเลื่อนแนวนอนแทน อ่านง่ายกว่าโดนบีบ */
export function DataTable({ columns, children }) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-left"
        style={{ minWidth: Math.max(720, columns.length * 132) }}
      >
        <thead>
          <tr className="border-b border-stone-200/60">
            {columns.map(c => (
              <th
                key={c.key}
                className={`whitespace-nowrap px-5 pb-3 text-xs font-medium text-stone-400 ${c.align === 'right' ? 'text-right' : ''} ${c.width || ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ── แถว — สูงโปร่ง (py-4) ไม่มีเส้นคั่นหนา ใช้ hover บอกตำแหน่ง ── */
export function Row({ onClick, selected, children }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-stone-100 last:border-0 ${selected ? 'bg-clay-100/40' : ''} ${
        onClick ? 'cursor-pointer transition-colors hover:bg-stone-50/80' : ''
      }`}
    >
      {children}
    </tr>
  );
}

/* ภาษาไทยไม่มีเว้นวรรคระหว่างคำ เบราว์เซอร์จึงตัดบรรทัดกลางคำได้
   ("โน้ตบุ๊ค" -> "โน้ต" / "บุ๊ค") ในช่องตารางจึงบังคับไม่ให้ตัดบรรทัดเลย
   ค่าที่ยาวเกินให้ใช้ <Clamp> ครอบเพื่อตัดท้ายด้วย … แทน */
export function Cell({ align, children, className = '' }) {
  return (
    <td className={`whitespace-nowrap px-5 py-4 align-middle ${align === 'right' ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  );
}

/* จำกัดความกว้างของข้อความยาว (หมายเหตุ / Serial / ชื่อผู้จัดจำหน่าย)
   ไม่ให้ดันคอลัมน์อื่นจนแคบ — เกินแล้วตัดท้ายเป็น … และโชว์เต็มตอน hover
   ต้องเป็น block ถึงจะ truncate ได้ เพราะ max-width บน <td> ใน table-layout:auto
   เบราว์เซอร์ไม่ได้บังคับใช้ */
export function Clamp({ children, width = 220 }) {
  const t = typeof children === 'string' ? children : undefined;
  return (
    <span className="block truncate" style={{ maxWidth: width }} title={t}>
      {children}
    </span>
  );
}

/* ── รูปย่อหน้าแถว ──
   มีรูปก็โชว์รูป ไม่มีก็เป็นไทล์ไอคอนตามหมวด ขนาดคงที่ 40px
   ทุกแถวจึงสูงเท่ากันไม่ว่ารายการนั้นจะมีรูปหรือไม่
   fit="contain" ใช้กับโลโก้โปรแกรม ที่ครอบรูปแล้วจะโดนตัดขอบ */
export function Thumb({ src, alt = '', icon: Icon, fit = 'cover' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`size-10 shrink-0 rounded-xl border border-stone-200/60 bg-white ${
          fit === 'contain' ? 'object-contain p-1' : 'object-cover'}`}
      />
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-clay-600/[0.08] text-clay-600">
      <Icon className="size-4" strokeWidth={2} />
    </div>
  );
}

/* ── ชื่อ + บรรทัดรอง — ลดคอลัมน์โดยซ้อนข้อมูลรองไว้ใต้ชื่อ ── */
export function CellTitle({ title, sub, width = 280 }) {
  return (
    /* ต้องมี max-width ไม่งั้น truncate ไม่ทำงาน (คอลัมน์ขยายตามชื่อยาวแทน)
       แล้วไปแย่งพื้นที่คอลัมน์อื่นจนข้อความตกบรรทัด */
    <div className="min-w-0" style={{ maxWidth: width }}>
      <p className="truncate text-sm font-medium text-stone-900">{title || '—'}</p>
      {sub && <p className={`mt-0.5 truncate ${text.faint}`}>{sub}</p>}
    </div>
  );
}

/* ── แบ่งหน้า — เรียบ ไม่มีเลขหน้ายาวเหยียด ── */
export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = 'inline-flex size-9 items-center justify-center rounded-xl border border-stone-200/60 bg-white text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-200/60 disabled:hover:text-stone-500';
  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <p className={text.faint}>
        {from.toLocaleString('th-TH')}–{to.toLocaleString('th-TH')} จาก {total.toLocaleString('th-TH')}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="หน้าก่อนหน้า">
          <ChevronLeft className="size-5" strokeWidth={2} />
        </button>
        <span className="min-w-[72px] text-center text-sm tabular-nums text-stone-500">{page} / {pages}</span>
        <button type="button" className={btn} onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="หน้าถัดไป">
          <ChevronRight className="size-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/* ── แถบเมื่อเลือกหลายรายการ — โผล่เฉพาะตอนมีของถูกเลือก ── */
export function BulkBar({ count, onClear, actions = [] }) {
  if (count === 0) return null;
  return (
    <div className={`${surface.card} flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3.5`}>
      <span className="text-sm text-stone-600">
        เลือกไว้ <b className="font-medium tabular-nums text-clay-600">{count.toLocaleString('th-TH')}</b> รายการ
      </span>
      <div className="ml-auto flex items-center gap-2.5">
        {actions.map(a => (
          <button
            key={a.key} type="button" onClick={a.onSelect}
            className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
              a.tone === 'danger'
                ? 'border-stone-200/60 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                : 'border-stone-200/60 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
            }`}
          >
            {a.label}
          </button>
        ))}
        <button type="button" onClick={onClear} className={`${text.faint} transition-colors hover:text-stone-700`}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
