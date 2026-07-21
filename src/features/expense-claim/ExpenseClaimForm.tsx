import type { ExpenseItem, ExpenseHeader } from '../../types/schema'
import { emptyItem } from '../../types/schema'
import { computeItem, computeTotals } from './calc'

interface Props {
  header: ExpenseHeader
  items: ExpenseItem[]
  onHeaderChange: (h: ExpenseHeader) => void
  onItemsChange: (items: ExpenseItem[]) => void
}

const CATEGORIES = ['ค่าไมล์เลทและค่าใช้จ่ายเดินทาง', 'ค่าใช้จ่ายต่างๆ', 'ค่าล่วงเวลา', 'ค่าเบี้ยเลี้ยง']

export default function ExpenseClaimForm({ header, items, onHeaderChange, onItemsChange }: Props) {
  const computed = items.map(computeItem)
  const totals = computeTotals(items)

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
      <div className="flex flex-wrap gap-4">
        {CATEGORIES.map(c => (
          <label key={c} className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={header.categories.includes(c)} onChange={() => toggleCategory(c)} /> {c}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <input className="rounded border px-2 py-1" placeholder="ชื่อ" value={header.firstName} onChange={e => onHeaderChange({ ...header, firstName: e.target.value })} />
        <input className="rounded border px-2 py-1" placeholder="นามสกุล" value={header.lastName} onChange={e => onHeaderChange({ ...header, lastName: e.target.value })} />
        <input className="rounded border px-2 py-1" placeholder="ตำแหน่ง" value={header.position} onChange={e => onHeaderChange({ ...header, position: e.target.value })} />
        <input className="rounded border px-2 py-1" placeholder="Job" value={header.job} onChange={e => onHeaderChange({ ...header, job: e.target.value })} />
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>{['วันเดือนปี','PC Code','PC Name','วันทำงาน','วันละ','ธนาคาร','ก่อนหัก','หัก3%','สุทธิ',''].map(h => <th key={h} className="border px-1 py-1">{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="border p-1"><input className="w-24" value={it.date} onChange={e => setItem(i, { date: e.target.value })} /></td>
              <td className="border p-1"><input className="w-20" value={it.pcCode} onChange={e => setItem(i, { pcCode: e.target.value })} /></td>
              <td className="border p-1"><input className="w-32" value={it.pcName} onChange={e => setItem(i, { pcName: e.target.value })} /></td>
              <td className="border p-1"><input type="number" className="w-16" value={it.workDays} onChange={e => setItem(i, { workDays: Number(e.target.value) })} /></td>
              <td className="border p-1"><input type="number" className="w-16" value={it.ratePerDay} onChange={e => setItem(i, { ratePerDay: Number(e.target.value) })} /></td>
              <td className="border p-1"><input className="w-28" value={it.bankAccount} onChange={e => setItem(i, { bankAccount: e.target.value })} /></td>
              <td className="border p-1 text-right">{computed[i].amountBeforeWht.toLocaleString()}</td>
              <td className="border p-1 text-right">
                <label className="block text-[10px]"><input type="checkbox" checked={it.applyWht}
                  onChange={e => setItem(i, { applyWht: e.target.checked })} /> หัก3%</label>
                <input type="number" className="w-16 text-right" value={computed[i].wht3}
                  onChange={e => setOverride(i, 'wht3', Number(e.target.value), true)} />
                <label className="block text-[10px]"><input type="checkbox" checked={!!it.overrides.wht3}
                  onChange={e => setOverride(i, 'wht3', computed[i].wht3, e.target.checked)} /> แก้เอง</label>
              </td>
              <td className="border p-1 text-right">{computed[i].amountNet.toLocaleString()}</td>
              <td className="border p-1"><button className="text-red-600" onClick={() => onItemsChange(items.filter((_, x) => x !== i))}>ลบ</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-medium">
            <td className="border p-1 text-right" colSpan={6}>รวมทั้งสิ้น</td>
            <td className="border p-1 text-right">{totals.totalBefore.toLocaleString()}</td>
            <td className="border p-1 text-right">{totals.totalWht.toLocaleString()}</td>
            <td className="border p-1 text-right">{totals.totalNet.toLocaleString()}</td>
            <td className="border"></td>
          </tr>
        </tfoot>
      </table>
      <button className="rounded border px-3 py-1 text-sm" onClick={() => onItemsChange([...items, emptyItem()])}>+ เพิ่มแถว</button>
      <p className="text-sm">เป็นจำนวนเงิน: <b>{totals.amountInThaiText}</b></p>
    </div>
  )
}
