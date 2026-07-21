import type { Company, ExpenseHeader, ExpenseItem } from '../../types/schema'
import { computeItem, computeTotals } from './calc'

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseItem[]; docNumber: string }

export default function ExpenseClaimPreview({ company, header, items, docNumber }: Props) {
  const computed = items.map(computeItem)
  const totals = computeTotals(items)
  return (
    <div id="print-area" className="mx-auto max-w-3xl bg-white p-8 text-sm">
      <div className="text-center font-medium">{company?.name}</div>
      <div className="text-center text-xs">{company?.address}</div>
      <div className="text-right text-xs">{docNumber}</div>
      <div className="mt-2">เรื่อง ขออนุมัติเบิกค่าใช้จ่าย &nbsp; หมวด: {header.categories.join(', ')}</div>
      <div>เรียน ท่านผู้จัดการ</div>
      <div className="mt-1">ชื่อ {header.firstName} {header.lastName} ตำแหน่ง {header.position} Job {header.job}</div>
      <table className="mt-3 w-full border-collapse border text-xs">
        <thead><tr>{['วันเดือนปี','PC Code','PC Name','วันทำงาน','วันละ','ธนาคาร','ก่อนหัก','หัก3%','สุทธิ'].map(h => <th key={h} className="border px-1">{h}</th>)}</tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="border px-1">{it.date}</td><td className="border px-1">{it.pcCode}</td>
              <td className="border px-1">{it.pcName}</td><td className="border px-1 text-center">{it.workDays}</td>
              <td className="border px-1 text-right">{it.ratePerDay}</td><td className="border px-1">{it.bankAccount}</td>
              <td className="border px-1 text-right">{computed[i].amountBeforeWht.toLocaleString()}</td>
              <td className="border px-1 text-right">{computed[i].wht3.toLocaleString()}</td>
              <td className="border px-1 text-right">{computed[i].amountNet.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="font-medium"><td className="border px-1 text-right" colSpan={6}>รวมทั้งสิ้น</td>
            <td className="border px-1 text-right">{totals.totalBefore.toLocaleString()}</td>
            <td className="border px-1 text-right">{totals.totalWht.toLocaleString()}</td>
            <td className="border px-1 text-right">{totals.totalNet.toLocaleString()}</td></tr>
        </tbody>
      </table>
      <div className="mt-2">เป็นจำนวนเงิน {totals.amountInThaiText}</div>
      <div className="mt-8 grid grid-cols-3 gap-8 text-center text-xs">
        <div>....................<br/>ผู้เบิก</div><div>....................<br/>หัวหน้าแผนก</div><div>....................<br/>ผู้อนุมัติ</div>
      </div>
    </div>
  )
}
