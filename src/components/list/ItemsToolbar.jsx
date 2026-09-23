import { useState, useRef, useEffect } from 'react';
import { Search, X, Plus, Upload, MoreHorizontal, Trash2 } from 'lucide-react';

/* แถบหัวของ "รายการย่อย" — ใช้ร่วมทั้ง License และอุปกรณ์เสริม

   ของเดิมยัดทุกอย่างไว้แถวเดียว: ชื่อ · checkbox เลือกทั้งหมด · นำเข้า CSV ·
   ปุ่มเพิ่ม แล้วต่อด้วยช่องค้นหาเต็มความกว้างอีกแถว
   ทั้งที่บางรายการมีของอยู่ชิ้นเดียว — ค้นหากับเลือกทั้งหมดไม่มีประโยชน์เลย

   โครงใหม่
     แถว 1  ชื่อ + จำนวน .................. [⋯ เมนูรอง] [+ เพิ่ม]
     แถว 2  ปุ่มกรอง ........... [เลือกทั้งหมด] [ค้นหา (กว้างจำกัด)]
   แถว 2 ขึ้นเฉพาะตอนมีของมากพอให้ต้องกรอง/ค้นหาจริง ๆ
   และถ้าเลือกอยู่ แถว 2 จะกลายเป็นแถบ "เลือก n รายการ" แทน */

const MIN_FOR_TOOLS = 2;   // มีชิ้นเดียวค้นหา/กรองไม่มีความหมาย

export default function ItemsToolbar({
  title,
  total = 0,
  shown = null,            // จำนวนหลังกรอง (ใส่เมื่อต่างจาก total)
  filters = [],            // [{ key, label, count }]
  activeFilter,
  onFilterChange,
  search = '',
  onSearchChange,
  searchPlaceholder = 'ค้นหา…',
  selectedCount = 0,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onImport,
  importLabel = 'นำเข้า CSV',
  onAdd,
  addLabel = 'เพิ่มรายการ',
  disabled = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const showTools = total >= MIN_FOR_TOOLS;
  const countLabel = shown != null && shown !== total ? `${shown}/${total}` : total;

  return (
    <>
      {/* ── แถว 1: ชื่อ + ปุ่มหลัก ── */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-4 w-1 shrink-0 rounded-full bg-clay-600" />
          <h4 className="truncate text-[13px] font-medium text-stone-600">
            {title} <span className="tabular-nums text-stone-400">({countLabel})</span>
          </h4>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onImport && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex size-8 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                title="ตัวเลือกเพิ่มเติม"
              >
                <MoreHorizontal className="size-4" strokeWidth={2} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-stone-200/60 bg-white py-1 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_20px_50px_-28px_rgba(22,32,36,0.20)]">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onImport(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    <Upload className="size-4 shrink-0 text-stone-400" strokeWidth={2} />
                    {importLabel}
                  </button>
                </div>
              )}
            </div>
          )}

          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-clay-700"
            >
              <Plus className="size-4" strokeWidth={2} />
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── แถว 2: กำลังเลือกอยู่ ── */}
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 bg-clay-50 px-5 py-2.5">
          <span className="text-[13px] font-medium text-clay-700">
            เลือกไว้ <span className="tabular-nums">{selectedCount}</span> รายการ
          </span>
          <div className="flex items-center gap-2">
            {onDeleteSelected && (
              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-brick-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" strokeWidth={2} /> ลบที่เลือก
              </button>
            )}
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:bg-stone-100"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : showTools && (
        /* ── แถว 2: ตัวกรอง + ค้นหา ── */
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-stone-100 px-5 py-2.5">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {filters.filter((f) => f.key === 'all' || f.count > 0).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeFilter === f.key
                    ? 'bg-clay-600 text-white'
                    : 'bg-sand-100 text-stone-600 hover:bg-sand-200'
                }`}
              >
                {f.label} <span className="tabular-nums opacity-70">{f.count}</span>
              </button>
            ))}
          </div>

          {onSelectAll && (
            <button
              type="button"
              onClick={onSelectAll}
              className="shrink-0 rounded-xl px-2.5 py-1.5 text-[13px] font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
            >
              เลือกทั้งหมด
            </button>
          )}

          {onSearchChange && (
            <div className="relative w-full shrink-0 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" strokeWidth={2} />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-stone-200/60 bg-stone-50 py-2 pl-9 pr-8 text-[13px] text-stone-700 outline-none transition-colors placeholder:text-stone-400 focus:border-clay-600 focus:bg-white focus:ring-2 focus:ring-clay-600/15"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600"
                  title="ล้างคำค้นหา"
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
