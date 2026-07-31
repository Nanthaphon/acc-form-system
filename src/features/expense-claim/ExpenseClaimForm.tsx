import type { ExpenseItem, ExpenseHeader } from '../../types/schema'
import { emptyItem } from '../../types/schema'
import { computeItem, computeTotals } from './calc'

interface Props {
  header: ExpenseHeader
  items: ExpenseItem[]
  onHeaderChange: (h: ExpenseHeader) => void
  onItemsChange: (items: ExpenseItem[]) => void
  categories?: string[]
}

const CATEGORIES = ['ค่าไมล์เลทและค่าใช้จ่ายเดินทาง', 'ค่าใช้จ่ายต่างๆ', 'ค่าล่วงเวลา', 'ค่าเบี้ยเลี้ยง']

const cardClass = 'rounded-2xl border border-[#e5eaf3] bg-white p-6 shadow-[0_1px_2px_rgba(16,32,64,0.03)]'
const cardTitleClass = "flex items-center gap-2 text-sm font-semibold text-[#16233f] before:block before:h-4 before:w-1 before:rounded-[3px] before:bg-[#2b5bd7]"
const inputClass = 'w-full rounded-[10px] border border-[#e5eaf3] bg-[#fbfcfe] px-3 py-2.5 text-sm placeholder:text-[#7a869a] focus:border-[#2b5bd7] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#2b5bd7]/[.12]'

export default function ExpenseClaimForm({ header, items, onHeaderChange, onItemsChange, categories }: Props) {
  const computed = items.map(computeItem)
  const totals = computeTotals(items)
  const categoryOptions = categories ?? CATEGORIES

  function setItem(idx: number, patch: Partial<ExpenseItem>) {
    onItemsChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }
  function setOverride(idx: number, field: keyof ExpenseItem, value: number, on: boolean) {
    const it = items[idx]
    setItem(idx, { [field]: value, overrides: { ...it.overrides, [field]: on } } as Partial<ExpenseItem>)
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

      {/* Items */}
      <div className={cardClass}>
        <h2 className={`${cardTitleClass} mb-4`}>รายการเบิก</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                {['วันเดือนปี', 'PC Code', 'PC Name', 'วันทำงาน', 'วันละ', 'ธนาคาร', 'ก่อนหัก', 'หัก 3%', 'สุทธิ', ''].map((h, idx, arr) => (
                  <th
                    key={h + idx}
                    className={`border-b border-[#e5eaf3] bg-[#f7f9fd] px-2.5 py-2.5 text-left text-xs font-semibold text-[#16233f] ${
                      idx === 0 ? 'rounded-tl-[10px]' : ''
                    } ${idx === arr.length - 1 ? 'rounded-tr-[10px]' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="hover:bg-[#fafbff]">
                  <td className="border-b border-[#eef2f8] p-2">
                    <input className="w-28 rounded-[8px] border border-[#e5eaf3] bg-white px-2.5 py-1.5 text-[13px]" value={it.date} onChange={e => setItem(i, { date: e.target.value })} />
                  </td>
                  <td className="border-b border-[#eef2f8] p-2">
                    <input className="w-20 rounded-[8px] border border-[#e5eaf3] bg-white px-2.5 py-1.5 text-[13px]" value={it.pcCode} onChange={e => setItem(i, { pcCode: e.target.value })} />
                  </td>
                  <td className="border-b border-[#eef2f8] p-2">
                    <input className="w-36 rounded-[8px] border border-[#e5eaf3] bg-white px-2.5 py-1.5 text-[13px]" value={it.pcName} onChange={e => setItem(i, { pcName: e.target.value })} />
                  </td>
                  <td className="border-b border-[#eef2f8] p-2">
                    <input type="number" className="w-16 rounded-[8px] border border-[#e5eaf3] bg-white px-2.5 py-1.5 text-right text-[13px]" value={it.workDays} onChange={e => setItem(i, { workDays: Number(e.target.value) })} />
                  </td>
                  <td className="border-b border-[#eef2f8] p-2">
                    <input type="number" className="w-16 rounded-[8px] border border-[#e5eaf3] bg-white px-2.5 py-1.5 text-right text-[13px]" value={it.ratePerDay} onChange={e => setItem(i, { ratePerDay: Number(e.target.value) })} />
                  </td>
                  <td className="border-b border-[#eef2f8] p-2">
                    <input className="w-32 rounded-[8px] border border-[#e5eaf3] bg-white px-2.5 py-1.5 text-[13px]" value={it.bankAccount} onChange={e => setItem(i, { bankAccount: e.target.value })} />
                  </td>
                  <td className="border-b border-[#eef2f8] p-2 text-right font-semibold text-[#16233f]">{computed[i].amountBeforeWht.toLocaleString()}</td>
                  <td className="border-b border-[#eef2f8] p-2 text-right">
                    <div className="font-semibold text-[#16233f]">{computed[i].wht3.toLocaleString()}</div>
                    <label className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#7a869a]">
                      <input type="checkbox" checked={it.applyWht} onChange={e => setItem(i, { applyWht: e.target.checked })} /> หัก
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-16 rounded-[8px] border border-[#e5eaf3] bg-white px-2 py-1 text-right text-[12px]"
                      value={computed[i].wht3}
                      onChange={e => setOverride(i, 'wht3', Number(e.target.value), true)}
                    />
                    <label className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#7a869a]">
                      <input type="checkbox" checked={!!it.overrides.wht3} onChange={e => setOverride(i, 'wht3', computed[i].wht3, e.target.checked)} /> แก้เอง
                    </label>
                  </td>
                  <td className="border-b border-[#eef2f8] p-2 text-right font-semibold text-[#16233f]">{computed[i].amountNet.toLocaleString()}</td>
                  <td className="border-b border-[#eef2f8] p-2 text-center">
                    <button className="text-[#d64545]" onClick={() => onItemsChange(items.filter((_, x) => x !== i))}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#b9c4da] bg-white px-4 py-2.5 text-sm font-medium text-[#2b5bd7]"
          onClick={() => onItemsChange([...items, emptyItem()])}
        >
          ＋ เพิ่มรายการ
        </button>
      </div>

      {/* Summary */}
      <div className={cardClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
          <div className="flex flex-1 flex-col justify-center gap-2.5">
            <div className="flex justify-between text-sm text-[#7a869a]">
              <span>รวมก่อนหัก</span> <b className="font-semibold text-[#1f2a3d]">{totals.totalBefore.toLocaleString()}</b>
            </div>
            <div className="flex justify-between text-sm text-[#7a869a]">
              <span>หักภาษี ณ ที่จ่าย 3%</span> <b className="font-semibold text-[#1f2a3d]">{totals.totalWht.toLocaleString()}</b>
            </div>
            <div className="flex justify-between border-t-[1.5px] border-dashed border-[#e5eaf3] pt-3 text-base">
              <span>รวมสุทธิทั้งสิ้น</span> <b className="font-semibold text-[#1e46b0]">{totals.totalNet.toLocaleString()} บาท</b>
            </div>
          </div>
          <div className="flex w-full flex-col justify-center rounded-[14px] bg-gradient-to-br from-[#2b5bd7] to-[#3b6fe0] px-5 py-4 text-white md:w-[300px]">
            <div className="mb-1.5 text-xs opacity-85">เป็นจำนวนเงิน (ตัวอักษร)</div>
            <div className="text-lg font-semibold leading-relaxed">{totals.amountInThaiText}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
