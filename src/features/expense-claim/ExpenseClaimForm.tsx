import { Plus, Trash2 } from 'lucide-react'
import type { ExpenseHeader, ExpenseRow, FormColumn } from '../../types/schema'
import { emptyRow, EXPENSE_CLAIM_DEFAULT_COLUMNS } from '../../types/schema'
import { computeRow, computeColumnTotals, bahtTextForRows, visibleColumns } from './calc'

interface Props {
  header: ExpenseHeader
  items: ExpenseRow[]
  onHeaderChange: (h: ExpenseHeader) => void
  onItemsChange: (items: ExpenseRow[]) => void
  columns?: FormColumn[]
  categories?: string[]
}

const CATEGORIES = ['ค่าไมล์เลทและค่าใช้จ่ายเดินทาง', 'ค่าใช้จ่ายต่างๆ', 'ค่าล่วงเวลา', 'ค่าเบี้ยเลี้ยง']

const cardClass = 'rounded-2xl border border-[#e5eaf3] bg-white p-6 shadow-[0_1px_2px_rgba(16,32,64,0.03)]'
const cardTitleClass = "flex items-center gap-2 text-sm font-semibold text-[#16233f] before:block before:h-4 before:w-1 before:rounded-[3px] before:bg-[#2b5bd7]"
const inputClass = 'w-full rounded-[10px] border border-[#e5eaf3] bg-[#fbfcfe] px-3 py-2.5 text-sm placeholder:text-[#7a869a] focus:border-[#2b5bd7] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#2b5bd7]/[.12]'

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function ExpenseClaimForm({ header, items, onHeaderChange, onItemsChange, columns, categories }: Props) {
  const cols = columns ?? EXPENSE_CLAIM_DEFAULT_COLUMNS
  const vcols = visibleColumns(cols)
  const computed = items.map(r => computeRow(cols, r))
  const columnTotals = computeColumnTotals(cols, items)
  const bahtWords = bahtTextForRows(cols, items)
  const categoryOptions = categories ?? CATEGORIES

  function setCell(rowIdx: number, key: string, value: string | number) {
    onItemsChange(items.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r))
  }
  function toggleCategory(c: string) {
    const has = header.categories.includes(c)
    onHeaderChange({ ...header, categories: has ? header.categories.filter(x => x !== c) : [...header.categories, c] })
  }

  return (
    <div className="space-y-4">
      {/* Category */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>ประเภทค่าใช้จ่าย</h2>
        <div className="flex flex-wrap gap-2.5">
          {categoryOptions.map(c => {
            const on = header.categories.includes(c)
            return (
              <label
                key={c}
                className={`flex cursor-pointer select-none items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-sm ${
                  on ? 'border-[#2b5bd7] bg-[#eaf0ff] font-semibold text-[#1e46b0]' : 'border-[#e5eaf3] text-[#7a869a]'
                }`}
              >
                <input type="checkbox" className="hidden" checked={on} onChange={() => toggleCategory(c)} />
                <span
                  className={`flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border-[1.5px] text-[10px] text-white ${
                    on ? 'border-[#2b5bd7] bg-[#2b5bd7]' : 'border-[#c3ccdb]'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                {c}
              </label>
            )
          })}
        </div>
      </div>

      {/* Requester */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>ข้อมูลผู้เบิก</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs text-[#7a869a]">ชื่อ</label>
            <input className={inputClass} placeholder="ชื่อ" value={header.firstName} onChange={e => onHeaderChange({ ...header, firstName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#7a869a]">นามสกุล</label>
            <input className={inputClass} placeholder="นามสกุล" value={header.lastName} onChange={e => onHeaderChange({ ...header, lastName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#7a869a]">ตำแหน่ง</label>
            <input className={inputClass} placeholder="ตำแหน่ง" value={header.position} onChange={e => onHeaderChange({ ...header, position: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#7a869a]">Job</label>
            <input className={inputClass} placeholder="Job" value={header.job} onChange={e => onHeaderChange({ ...header, job: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Items — dynamic columns */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>รายการเบิก</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="w-8 rounded-tl-[10px] border-b border-[#e5eaf3] bg-[#f7f9fd] px-1.5 py-2.5 text-center text-xs font-semibold text-[#16233f]">#</th>
                {vcols.map(col => (
                  <th
                    key={col.key}
                    className={`truncate border-b border-[#e5eaf3] bg-[#f7f9fd] px-1.5 py-2.5 text-[11px] font-semibold text-[#16233f] ${
                      col.type === 'text' ? 'text-left' : 'text-right'
                    }`}
                  >
                    {col.label}
                    {col.type === 'calc' && <span className="ml-1 text-[10px] font-normal text-[#7a869a]">(คำนวณ)</span>}
                  </th>
                ))}
                <th className="w-9 rounded-tr-[10px] border-b border-[#e5eaf3] bg-[#f7f9fd] px-1.5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i} className="hover:bg-[#fafbff]">
                  <td className="border-b border-[#eef2f8] p-2 text-center text-[#7a869a]">{i + 1}</td>
                  {vcols.map(col => (
                    <td key={col.key} className="border-b border-[#eef2f8] p-1">
                      {col.type === 'calc' ? (
                        <div className="truncate text-right font-semibold text-[#16233f]">
                          {fmt(Number(computed[i][col.key]) || 0)}
                        </div>
                      ) : col.type === 'number' ? (
                        <input
                          type="number"
                          className="w-full min-w-0 rounded-[8px] border border-[#e5eaf3] bg-white px-2 py-1.5 text-right text-xs"
                          value={row[col.key] as number}
                          onChange={e => setCell(i, col.key, Number(e.target.value))}
                        />
                      ) : (
                        <input
                          className="w-full min-w-0 rounded-[8px] border border-[#e5eaf3] bg-white px-2 py-1.5 text-xs"
                          value={row[col.key] as string}
                          onChange={e => setCell(i, col.key, e.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="border-b border-[#eef2f8] p-2 text-center">
                    <button className="text-[#d64545]" onClick={() => onItemsChange(items.filter((_, x) => x !== i))}><Trash2 size={16} className="mx-auto" /></button>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="font-semibold text-[#16233f]">
                <td className="px-2.5 py-2.5"></td>
                {vcols.map((col, idx) => (
                  <td key={col.key} className={`px-2.5 py-2.5 ${col.type === 'text' ? 'text-left' : 'text-right'}`}>
                    {idx === 0 ? 'รวม' : col.type !== 'text' ? fmt(columnTotals[col.key] ?? 0) : ''}
                  </td>
                ))}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-4 py-2.5 text-sm font-medium text-[#2b5bd7]"
          onClick={() => onItemsChange([...items, emptyRow(cols)])}
        >
          <Plus size={16} /> เพิ่มรายการ
        </button>
      </div>

      {/* Summary */}
      <div className={cardClass}>
        <div className="flex w-full flex-col justify-center rounded-[14px] bg-gradient-to-br from-[#2b5bd7] to-[#3b6fe0] px-5 py-4 text-white">
          <div className="mb-1.5 text-xs opacity-85">เป็นจำนวนเงิน (ตัวอักษร)</div>
          <div className="text-lg font-semibold leading-relaxed">{bahtWords}</div>
        </div>
      </div>
    </div>
  )
}
