import React, { useState } from 'react';
import { SlidersHorizontal, X, Columns3 } from 'lucide-react';
import { surface, text, button, fmt } from '../../ui/earth.js';
import {
  Panel, ActionMenu, EmptyState, Popover, Checkbox, CheckMark, BulkBar,
  SearchInput, DataTable, Row, Cell, Pagination,
} from '../../ui/earthUI.jsx';

/* ════════════════════════════════════════════════════════════════
   โครงหน้า "รายการ" กลาง — ธีม v3 (Earth tone · Minimalist & Clean)

   ทุกเมนูที่เป็นตาราง (ทรัพย์สิน / License / อุปกรณ์เสริม / พนักงาน)
   ใช้โครงนี้ร่วมกัน แล้วส่งเข้ามาแค่ "คอลัมน์" กับ "action" ของตัวเอง
   — แทนที่จะ copy หน้าเดียวกัน 4 รอบ

   เป็น controlled ทั้งหมด: ค้นหา / กรอง / แบ่งหน้า / การเลือก เป็น state
   ของผู้เรียก (App.jsx) ไม่เก็บซ้ำในนี้ เพื่อไม่ให้เกิดความจริงสองชุด
   ════════════════════════════════════════════════════════════════ */

export default function ListPage({
  title,
  /* ข้อมูล */
  rows = [],              // แถวของหน้าปัจจุบัน (กรอง + แบ่งหน้าแล้ว)
  totalCount = 0,         // จำนวนหลังกรอง
  unit = 'รายการ',
  emptyText = 'ไม่พบรายการที่ตรงกับเงื่อนไข',
  /* คอลัมน์: หลัก (เสมอ) + เสริม (เปิดปิดเองได้) */
  columns = [],           // [{ key, label, width, align, render(item) }]
  optionalColumns = [],   // [{ key, label, align, render(item) }]
  visibleColumns, onVisibleColumnsChange,
  /* ค้นหา */
  searchTerm = '', onSearchChange, searchPlaceholder = 'ค้นหา',
  /* ตัวกรอง — [{ key, label, selected: [], options: [], onChange }] */
  filters = [],
  /* แบ่งหน้า */
  page = 1, pageSize = 50, onPageChange,
  /* เลือกหลายรายการ */
  selectedIds = [], onSelect, onSelectAll, onClearSelection, bulkActions = [],
  /* แถบเครื่องมือ — [{ key, label, icon, onSelect, primary }] */
  toolbar = [],
  /* ต่อแถว */
  onOpen, rowActions,
}) {
  const [showFilter, setShowFilter] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const usableFilters = filters.filter(f => f.options?.length > 0);
  const activeFilters = usableFilters.reduce((n, f) => n + (f.selected?.length || 0), 0);
  const extraColumns = optionalColumns.filter(c => visibleColumns?.[c.key]);
  const selectable = typeof onSelect === 'function';
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  /* ปุ่มเลือกทั้งหมดผูกกับ handler เดิมที่เลือก "ทุกรายการในผลค้นหา" (ไม่ใช่แค่หน้านี้)
     ป้ายจึงต้องเขียนให้ตรงกับสิ่งที่มันทำจริง ไม่งั้นผู้ใช้เข้าใจผิด */
  const allSelected = totalCount > 0 && selectedIds.length >= totalCount;

  const tableColumns = [
    ...(selectable ? [{ key: '_sel', label: '', width: 'w-12' }] : []),
    ...columns,
    ...extraColumns.map(c => ({ key: c.key, label: c.label, align: c.align })),
    ...(rowActions ? [{ key: '_act', label: '', width: 'w-16' }] : []),
  ];

  return (
    <div className={`${surface.page} min-h-full`}>
      <div className="mx-auto max-w-[1360px] space-y-6 p-6 lg:p-8">

        {/* ── หัวหน้า + แถบเครื่องมือ ── */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className={text.h1}>{title}</h1>
            <p className={`mt-1 ${text.muted}`}>{fmt.num(totalCount)} {unit}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onSearchChange && (
              <SearchInput value={searchTerm} onChange={onSearchChange} placeholder={searchPlaceholder} />
            )}

            {usableFilters.length > 0 && (
              <button
                type="button" onClick={() => setShowFilter(v => !v)}
                className={button.ghost} aria-expanded={showFilter}
              >
                {showFilter
                  ? <X className="size-5" strokeWidth={2} />
                  : <SlidersHorizontal className="size-5" strokeWidth={2} />}
                ตัวกรอง
                {activeFilters > 0 && <Count n={activeFilters} />}
              </button>
            )}

            {/* ตัวเลือกคอลัมน์ — ซ่อนในกล่องลอย ไม่กินพื้นที่หน้าจอ */}
            {optionalColumns.length > 0 && onVisibleColumnsChange && (
              <Popover
                open={showColumns} onClose={() => setShowColumns(false)} width="w-60"
                trigger={
                  <button
                    type="button" onClick={() => setShowColumns(v => !v)}
                    className={button.ghost} aria-expanded={showColumns}
                  >
                    <Columns3 className="size-5" strokeWidth={2} /> คอลัมน์
                  </button>
                }
              >
                <p className="px-3 pb-1.5 pt-2 text-xs text-stone-400">คอลัมน์เสริม</p>
                {optionalColumns.map(c => (
                  <OptionRow
                    key={c.key} label={c.label} checked={!!visibleColumns?.[c.key]}
                    onSelect={() => onVisibleColumnsChange({ ...visibleColumns, [c.key]: !visibleColumns?.[c.key] })}
                  />
                ))}
              </Popover>
            )}

            {toolbar.map(t => (
              <button
                key={t.key} type="button" onClick={t.onSelect}
                className={t.primary ? button.primary : button.ghost}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </header>

        {showFilter && usableFilters.length > 0 && (
          <div className={`${surface.card} flex flex-wrap items-center gap-x-4 gap-y-3 p-5`}>
            {/* ส่ง prop ทีละตัว ไม่ spread ทั้งก้อน เพราะ object มีฟิลด์ key อยู่ด้วย
               ซึ่ง React ห้าม spread เข้า JSX (key ต้องส่งตรงๆ) */}
            {usableFilters.map(f => (
              <MultiFilter
                key={f.key} label={f.label} selected={f.selected}
                options={f.options} onChange={f.onChange}
              />
            ))}
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => usableFilters.forEach(f => f.onChange?.([]))}
                className={`${text.faint} transition-colors hover:text-clay-600`}
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}

        {/* ── แถบเลือกหลายรายการ — โผล่เฉพาะตอนมีของถูกเลือก ── */}
        {selectable && (
          <BulkBar
            count={selectedIds.length}
            onClear={() => (onClearSelection ? onClearSelection() : onSelectAll?.(false))}
            actions={bulkActions}
          />
        )}

        {/* ── ตาราง ── */}
        <Panel title="รายการทั้งหมด" meta={totalCount > 0 ? `หน้า ${page} จาก ${totalPages}` : undefined}>
          {rows.length === 0 ? (
            <EmptyState>{emptyText}</EmptyState>
          ) : (
            <>
              <DataTable columns={tableColumns}>
                {rows.map(item => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <Row key={item.id} selected={selected} onClick={onOpen ? () => onOpen(item) : undefined}>
                      {selectable && (
                        <Cell>
                          <Checkbox
                            checked={selected}
                            onChange={() => onSelect(item.id)}
                            label={`เลือก ${item.name || item.fullName || item.id}`}
                          />
                        </Cell>
                      )}
                      {columns.map(c => (
                        <Cell key={c.key} align={c.align} className={c.cellClass}>
                          {c.render(item)}
                        </Cell>
                      ))}
                      {extraColumns.map(c => (
                        <Cell key={c.key} align={c.align} className="text-sm text-stone-600">
                          <span className="block max-w-[220px] truncate">{c.render(item) || '—'}</span>
                        </Cell>
                      ))}
                      {rowActions && (
                        <Cell align="right">
                          {/* กันคลิกทะลุไปเปิดรายละเอียด */}
                          <div onClick={e => e.stopPropagation()} className="flex justify-end">
                            <ActionMenu items={rowActions(item)} />
                          </div>
                        </Cell>
                      )}
                    </Row>
                  );
                })}
              </DataTable>

              {selectable && (
                <button
                  type="button"
                  onClick={() => onSelectAll?.(!allSelected)}
                  className={`mt-4 ${text.faint} transition-colors hover:text-clay-600`}
                >
                  {allSelected
                    ? 'ยกเลิกที่เลือกทั้งหมด'
                    : `เลือกทั้งหมดในผลค้นหา (${totalCount.toLocaleString('th-TH')} ${unit})`}
                </button>
              )}

              <Pagination page={page} pageSize={pageSize} total={totalCount} onChange={onPageChange} />
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Count({ n }) {
  return <span className="rounded-lg bg-clay-100 px-1.5 py-0.5 text-xs font-medium text-clay-600">{n}</span>;
}

/* แถวตัวเลือกในกล่องลอย — ตัวแถวเป็นปุ่ม จึงใช้ CheckMark (span) ไม่ใช่ Checkbox
   ที่เป็น <button> เพราะ <button> ซ้อน <button> เป็น HTML ที่ไม่ถูกต้อง */
function OptionRow({ label, checked, onSelect }) {
  return (
    <button
      type="button" role="menuitemcheckbox" aria-checked={checked} onClick={onSelect}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
    >
      <CheckMark checked={checked} />
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ── ตัวกรองแบบเลือกได้หลายค่า — ซ่อนรายการตัวเลือกไว้ในกล่องลอย
   options รับได้ทั้ง ['ก', 'ข'] และ [{ value, label }] สำหรับกรณีที่ค่าที่เก็บ
   ไม่เหมือนข้อความที่แสดง (เช่น ตัวกรองวันหมดอายุของ License) ── */
function MultiFilter({ label, selected = [], onChange, options = [] }) {
  const [open, setOpen] = useState(false);
  const items = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const toggle = (v) => onChange?.(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <Popover
      open={open} onClose={() => setOpen(false)} align="left" width="w-64"
      trigger={
        <button type="button" onClick={() => setOpen(v => !v)} className={button.ghost} aria-expanded={open}>
          {label}
          {selected.length > 0 && <Count n={selected.length} />}
        </button>
      }
    >
      <div className="max-h-72 overflow-auto">
        {items.map(o => (
          <OptionRow key={o.value} label={o.label} checked={selected.includes(o.value)} onSelect={() => toggle(o.value)} />
        ))}
      </div>
    </Popover>
  );
}
