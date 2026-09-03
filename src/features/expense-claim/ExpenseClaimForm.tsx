import { Plus, Trash2 } from 'lucide-react'
import ActionIconButton from '../../components/ActionIconButton'
import type { ExpenseHeader, ExpenseRow, FormColumn, HeaderField } from '../../types/schema'
import { emptyRow, EXPENSE_CLAIM_DEFAULT_COLUMNS, isTextCol } from '../../types/schema'
import { computeRow, computeColumnTotals, grandTotal, taxSummary, visibleColumns } from './calc'
import { bahtText } from '../../shared/bahttext'
import DateInput from '../../components/DateInput'

interface Props {
  header: ExpenseHeader
  items: ExpenseRow[]
  onHeaderChange: (h: ExpenseHeader) => void
  onItemsChange: (items: ExpenseRow[]) => void
  columns?: FormColumn[]
  categories?: string[]
  headerFields?: HeaderField[]
}

const CATEGORIES = ['ค่าไมล์เลทและค่าใช้จ่ายเดินทาง', 'ค่าใช้จ่ายต่างๆ', 'ค่าล่วงเวลา', 'ค่าเบี้ยเลี้ยง']

const cardClass = 'rounded-xl border border-gray-200 bg-white p-6'
const cardTitleClass = 'mb-4 text-[15px] font-semibold text-gray-900'
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-500'
const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100'

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function ExpenseClaimForm({ header, items, onHeaderChange, onItemsChange, columns, categories, headerFields }: Props) {
  const cols = columns ?? EXPENSE_CLAIM_DEFAULT_COLUMNS
  const setHField = (id: string, v: string) => onHeaderChange({ ...header, fields: { ...(header.fields ?? {}), [id]: v } })
  const vcols = visibleColumns(cols)
  const hasColumns = vcols.length > 0
  const computed = items.map(r => computeRow(cols, r))
  const columnTotals = computeColumnTotals(cols, items)
  const total = grandTotal(cols, items)
  const tax = taxSummary(total, header.vat, header.whtRate)
  const categoryOptions = categories ?? CATEGORIES

  function setCell(rowIdx: number, key: string, value: string | number) {
    onItemsChange(items.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r))
  }
  // Single-select: pick one category (clicking the selected one clears it).
  function selectCategory(c: string) {
    const has = header.categories.includes(c)
    onHeaderChange({ ...header, categories: has ? [] : [c] })
  }

  return (
    <div className="space-y-4">
      {/* Category — hidden when the form defines no categories */}
      {categoryOptions.length > 0 && (
        <div className={cardClass}>
          <h2 className={cardTitleClass}>ประเภทค่าใช้จ่าย</h2>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map(c => {
              const on = header.categories.includes(c)
              return (
                <label
                  key={c}
                  className={`flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                    on ? 'border-blue-500 bg-blue-50 font-medium text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input type="checkbox" className="hidden" checked={on} onChange={() => selectCategory(c)} />
                  <span
                    className={`flex h-[15px] w-[15px] items-center justify-center rounded-full border ${
                      on ? 'border-blue-500' : 'border-gray-300'
                    }`}
                  >
                    {on && <span className="h-[7px] w-[7px] rounded-full bg-blue-500" />}
                  </span>
                  {c}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Requester */}
      <div className={cardClass}>
        <h2 className={cardTitleClass}>ข้อมูลผู้เบิก</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>ชื่อ</label>
            <input className={inputClass} placeholder="ชื่อ" value={header.firstName} onChange={e => onHeaderChange({ ...header, firstName: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>นามสกุล</label>
            <input className={inputClass} placeholder="นามสกุล" value={header.lastName} onChange={e => onHeaderChange({ ...header, lastName: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>ตำแหน่ง</label>
            <input className={inputClass} placeholder="ตำแหน่ง" value={header.position} onChange={e => onHeaderChange({ ...header, position: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Job</label>
            <input className={inputClass} placeholder="Job" value={header.job} onChange={e => onHeaderChange({ ...header, job: e.target.value })} />
          </div>
          {(headerFields ?? []).map(f => (
            <div key={f.id}>
              <label className={labelClass}>{f.label || 'ช่องเพิ่มเติม'}</label>
              {f.type === 'date'
                ? <DateInput className={inputClass} value={header.fields?.[f.id] ?? ''} onChange={v => setHField(f.id, v)} />
                : <input className={inputClass} placeholder={f.label} value={header.fields?.[f.id] ?? ''} onChange={e => setHField(f.id, e.target.value)} />}
            </div>
          ))}
        </div>
      </div>

      {/* Items — dynamic columns */}
      <div className={cardClass}>
        <h2 className={cardTitleClass}>รายการเบิก</h2>
        {!hasColumns ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            ฟอร์มนี้ยังไม่ได้ตั้งค่าคอลัมน์<br />
            <span className="text-xs">ผู้ดูแลระบบต้องเพิ่มคอลัมน์ในหน้าแก้ไขฟอร์มก่อนจึงจะกรอกรายการได้</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="w-8 border-b border-gray-200 bg-gray-50 px-1.5 py-2.5 text-center text-xs font-medium text-gray-500">#</th>
                    {vcols.map(col => (
                      <th
                        key={col.key}
                        style={{ width: col.width ? `${col.width}px` : undefined }}
                        className={`whitespace-normal break-words border-b border-gray-200 bg-gray-50 px-1.5 py-2.5 text-[11px] font-medium text-gray-600 ${
                          isTextCol(col.type) ? 'text-left' : 'text-right'
                        }`}
                      >
                        {col.label}
                        {col.type === 'calc' && <span className="ml-1 text-[10px] font-normal text-gray-400">(คำนวณ)</span>}
                      </th>
                    ))}
                    <th className="w-9 border-b border-gray-200 bg-gray-50 px-1.5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="border-b border-gray-100 p-2 text-center text-gray-400">{i + 1}</td>
                      {vcols.map(col => (
                        <td key={col.key} className="border-b border-gray-100 p-1">
                          {col.type === 'calc' ? (
                            <div className="truncate px-1 text-right font-medium text-gray-900">
                              {fmt(Number(computed[i][col.key]) || 0)}
                            </div>
                          ) : col.type === 'date' ? (
                            <DateInput
                              className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              value={row[col.key] as string}
                              onChange={v => setCell(i, col.key, v)}
                            />
                          ) : col.type === 'number' ? (
                            <input
                              type="number"
                              className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-right text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              value={row[col.key] as number}
                              onChange={e => setCell(i, col.key, Number(e.target.value))}
                            />
                          ) : col.type === 'select' ? (
                            <select
                              className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              value={row[col.key] as string}
                              onChange={e => setCell(i, col.key, e.target.value)}
                            >
                              <option value="">— เลือก —</option>
                              {(col.options ?? []).filter(o => o.trim()).map((o, oi) => <option key={oi} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              value={row[col.key] as string}
                              onChange={e => setCell(i, col.key, e.target.value)}
                            />
                          )}
                        </td>
                      ))}
                      <td className="border-b border-gray-100 p-2 text-center">
                        <ActionIconButton
                          label="ลบรายการ"
                          tone="red"
                          icon={<Trash2 size={16} />}
                          onClick={() => onItemsChange(items.filter((_, x) => x !== i))}
                        />
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="font-semibold text-gray-900">
                    <td className="border-t border-gray-200 px-2.5 py-2.5"></td>
                    {vcols.map((col, idx) => (
                      <td key={col.key} className={`border-t border-gray-200 px-2.5 py-2.5 ${isTextCol(col.type) ? 'text-left' : 'text-right'}`}>
                        {idx === 0 ? 'รวม' : isTextCol(col.type) ? '' : fmt(columnTotals[col.key] ?? 0)}
                      </td>
                    ))}
                    <td className="border-t border-gray-200"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
              onClick={() => onItemsChange([...items, emptyRow(cols)])}
            >
              <Plus size={16} /> เพิ่มรายการ
            </button>
          </>
        )}
      </div>

      {/* Summary + tax options */}
      {hasColumns && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-700">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={!!header.vat} onChange={e => onHeaderChange({ ...header, vat: e.target.checked })} />
              ภาษีมูลค่าเพิ่ม (VAT) 7%
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={!!header.whtRate} onChange={e => onHeaderChange({ ...header, whtRate: e.target.checked ? 3 : 0 })} />
                หัก ณ ที่จ่าย
              </label>
              {!!header.whtRate && [3, 5].map(r => (
                <label key={r} className="flex cursor-pointer items-center gap-1">
                  <input type="radio" name="whtRate" checked={header.whtRate === r} onChange={() => onHeaderChange({ ...header, whtRate: r })} />
                  {r}%
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1 border-t border-gray-200 pt-3 text-sm">
            <div className="flex justify-between text-gray-600"><span>ยอดรวม (ก่อนภาษี)</span><span>{fmt(tax.subtotal)}</span></div>
            {header.vat && <div className="flex justify-between text-gray-600"><span>ภาษีมูลค่าเพิ่ม 7%</span><span>+{fmt(tax.vatAmount)}</span></div>}
            {!!header.whtRate && <div className="flex justify-between text-red-600"><span>หัก ณ ที่จ่าย {header.whtRate}%</span><span>−{fmt(tax.whtAmount)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
              <span>ยอดสุทธิ</span><span>{fmt(tax.netTotal)} บาท</span>
            </div>
            <div className="text-xs text-gray-500">{`(${bahtText(tax.netTotal)})`}</div>
          </div>
        </div>
      )}
    </div>
  )
}
