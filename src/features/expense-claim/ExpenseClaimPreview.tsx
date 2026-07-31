import type { Company, ExpenseHeader, ExpenseItem, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { computeItem, computeTotals } from './calc'

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseItem[]; docNumber: string; settings?: FormSettings }

const DEFAULT_ADDRESS =
  '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น6 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ'

const MIN_ROWS = 14

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ExpenseClaimPreview({ company, header, items, docNumber, settings = EXPENSE_CLAIM_DEFAULTS }: Props) {
  const computed = items.map(computeItem)
  const totals = computeTotals(items)
  const emptyRowCount = Math.max(0, MIN_ROWS - items.length)

  return (
    <div id="print-area" style={{ fontFamily: "'Sarabun', serif" }} className="mx-auto max-w-3xl border border-black bg-white p-6 text-xs text-black">
      {/* Header band */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {company?.logo
            ? <img src={company.logo} alt="logo" className="h-10 w-10 shrink-0 border border-black object-contain" />
            : <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-black text-center text-[9px] leading-tight">
                LOGO
              </div>}
          <div>
            <div className="text-sm font-bold">GLOBE SYNDICATE (THAILAND) CO.,LTD.</div>
            <div className="font-bold">{company?.address || DEFAULT_ADDRESS}</div>
          </div>
        </div>
        <div className="shrink-0 border border-black px-3 py-2 text-center text-sm font-bold">
          {settings.title}
        </div>
      </div>
      <div className="mt-2 border-t-2 border-black" />
      <div className="mt-1 text-right">{docNumber || settings.formCode}</div>

      {/* เรื่อง / เรียน + checkboxes */}
      <div className="mt-2 flex items-start justify-between">
        <div>
          <div>เรื่อง &nbsp; {settings.subject}</div>
          <div>เรียน &nbsp; {settings.attention}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {settings.categories.map((label) => (
            <div key={label} className="whitespace-nowrap">
              <span className="mr-1">{header.categories.includes(label) ? '☑' : '☐'}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Requester line */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span>ชื่อ</span>
        <span className="min-w-[80px] border-b border-black px-1">{header.firstName}</span>
        <span>นามสกุล</span>
        <span className="min-w-[80px] border-b border-black px-1">{header.lastName}</span>
        <span>ตำแหน่ง</span>
        <span className="min-w-[80px] border-b border-black px-1">{header.position}</span>
        <span>Job</span>
        <span className="min-w-[80px] border-b border-black px-1">{header.job}</span>
      </div>

      {/* Main table */}
      <table className="mt-3 w-full border-collapse border border-black text-[10px]">
        <thead>
          <tr>
            <th rowSpan={2} className="border border-black px-1 py-1">วันเดือนปี</th>
            <th rowSpan={2} className="border border-black px-1 py-1">ลำดับ</th>
            <th colSpan={4} className="border border-black px-1 py-1">รายละเอียด</th>
            <th rowSpan={2} className="border border-black px-1 py-1">ธนาคาร</th>
            <th rowSpan={2} className="border border-black px-1 py-1">ประเภทพีซี</th>
            <th rowSpan={2} className="border border-black px-1 py-1">Job</th>
            <th colSpan={3} className="border border-black px-1 py-1">จำนวนเงิน</th>
          </tr>
          <tr>
            <th className="border border-black px-1 py-1">PC Code</th>
            <th className="border border-black px-1 py-1">PC Name</th>
            <th className="border border-black px-1 py-1">วันทำงาน</th>
            <th className="border border-black px-1 py-1">วันละ</th>
            <th className="border border-black px-1 py-1">ก่อนหัก</th>
            <th className="border border-black px-1 py-1">หักภาษี ณ ที่จ่าย 3%</th>
            <th className="border border-black px-1 py-1">รวม</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="border border-black px-1 py-0.5">{it.date}</td>
              <td className="border border-black px-1 py-0.5 text-center">{i + 1}</td>
              <td className="border border-black px-1 py-0.5">{it.pcCode}</td>
              <td className="border border-black px-1 py-0.5">{it.pcName}</td>
              <td className="border border-black px-1 py-0.5 text-center">{it.workDays}</td>
              <td className="border border-black px-1 py-0.5 text-right">{it.ratePerDay.toLocaleString()}</td>
              <td className="border border-black px-1 py-0.5">{it.bankAccount}</td>
              <td className="border border-black px-1 py-0.5">{it.pcType}</td>
              <td className="border border-black px-1 py-0.5">{it.job}</td>
              <td className="border border-black px-1 py-0.5 text-right">{money(computed[i].amountBeforeWht)}</td>
              <td className="border border-black px-1 py-0.5 text-right">{money(computed[i].wht3)}</td>
              <td className="border border-black px-1 py-0.5 text-right">{money(computed[i].amountNet)}</td>
            </tr>
          ))}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <tr key={`empty-${i}`}>
              {Array.from({ length: 12 }).map((__, j) => (
                <td key={j} className="border border-black px-1 py-0.5">&nbsp;</td>
              ))}
            </tr>
          ))}
          <tr className="font-bold">
            <td className="border border-black px-1 py-1 text-right" colSpan={9}>รวมทั้งสิ้น</td>
            <td className="border border-black px-1 py-1 text-right">{money(totals.totalBefore)}</td>
            <td className="border border-black px-1 py-1 text-right">{money(totals.totalWht)}</td>
            <td className="border border-black px-1 py-1 text-right">{money(totals.totalNet)}</td>
          </tr>
        </tbody>
      </table>

      {/* เป็นจำนวนเงิน */}
      <div className="mt-2 border border-black px-2 py-1 text-center">
        เป็นจำนวนเงิน &nbsp; {totals.amountInThaiText}
      </div>

      {/* Signature blocks */}
      <div className="mt-8 grid grid-cols-3 gap-8 text-center">
        <div>
          <div className="border-b border-black">&nbsp;</div>
          <div className="mt-1">ผู้เบิก</div>
          <div className="mt-2">วันที่ ................</div>
        </div>
        <div>
          <div className="border-b border-black">&nbsp;</div>
          <div className="mt-1">หัวหน้าแผนก</div>
          <div className="mt-2">วันที่ ................</div>
        </div>
        <div>
          <div className="border-b border-black">&nbsp;</div>
          <div className="mt-1">ผู้อนุมัติ</div>
          <div className="mt-2">วันที่ ................</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-8 text-center">
        <div>
          <div className="border-b border-black">&nbsp;</div>
          <div className="mt-1">ผู้รับเงิน</div>
          <div className="mt-2">วันที่ ................</div>
        </div>
        <div>
          <div className="border-b border-black">&nbsp;</div>
          <div className="mt-1">ผู้ตรวจสอบ/ฝ่ายบัญชี</div>
          <div className="mt-2">วันที่ ................</div>
        </div>
      </div>

      {/* หมายเหตุ */}
      <div className="mt-6 text-[9px]">
        <div className="font-bold">หมายเหตุ:</div>
        {settings.notes.map((note, i) => (
          <div key={i}>{note}</div>
        ))}
      </div>
    </div>
  )
}
