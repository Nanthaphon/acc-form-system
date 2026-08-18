import type { Company, ExpenseHeader, ExpenseRow, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS } from '../../types/schema'
import { computeRow, computeColumnTotals, grandTotal, taxSummary, visibleColumns } from './calc'
import { bahtText } from '../../shared/bahttext'
import { formatDate, formatIsoDate } from '../../shared/date'

interface Approval { name?: string | null; signature?: string | null; at?: number | null }
interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseRow[]; docNumber: string; settings?: FormSettings; approval?: Approval }

const DEFAULT_ADDRESS =
  '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น6 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ'

// Rows that fit on a single sheet. When items exceed this, they overflow onto
// the next sheet (stacked below on screen, a new page when printed). Every
// sheet is a complete form on its own — same header, requester, grand total,
// amount-in-words, signatures and notes.
const ROWS_PER_PAGE = 14

function money(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// One signature cell. Every cell has the same fixed-height signing area so all
// lines and labels line up across the row; only the approver cell fills in the
// online signature + name + date.
function SignatureBlock({ label, approval }: { label: string; approval?: Approval }) {
  return (
    <div>
      <div className="flex h-10 items-end justify-center border-b border-black">
        {approval?.signature ? <img src={approval.signature} alt="ลายเซ็น" className="max-h-10 object-contain pb-0.5" /> : <>&nbsp;</>}
      </div>
      <div className="mt-1">{label}</div>
      <div className="mt-2 leading-tight">
        {approval?.name
          ? <>({approval.name})<br />{approval.at ? `วันที่ ${formatDate(approval.at)}` : ''}</>
          : 'วันที่ ................'}
      </div>
    </div>
  )
}

export default function ExpenseClaimPreview({ company, header, items, settings = EXPENSE_CLAIM_DEFAULTS, approval }: Props) {
  const cols = settings.columns
  const vcols = visibleColumns(cols)
  const computed = items.map(r => computeRow(cols, r))
  const columnTotals = computeColumnTotals(cols, items)
  const tax = taxSummary(grandTotal(cols, items), header.vat, header.whtRate)
  const hasTax = !!header.vat || !!header.whtRate
  const bahtWords = bahtText(tax.netTotal)
  const notes = (settings.notes ?? []).filter(n => (n ?? '').trim() !== '')
  const totalCols = vcols.length + 1 // + leading seq column

  // Totals footer: label spans the seq column + leading text columns up to the first visible numeric/calc column.
  const firstNumericIdx = vcols.findIndex(c => c.type !== 'text' && c.type !== 'date')
  const labelSpan = firstNumericIdx < 0 ? totalCols : firstNumericIdx + 1

  // Split the row indices into pages of ROWS_PER_PAGE. Always at least one page
  // (so an empty form still renders a blank sheet).
  const pages: number[][] = []
  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    pages.push(Array.from({ length: Math.min(ROWS_PER_PAGE, items.length - i) }, (_, k) => i + k))
  }
  if (pages.length === 0) pages.push([])
  const totalPages = pages.length

  return (
    <div id="print-area" style={{ fontFamily: "'Sarabun', serif" }} className="mx-auto max-w-3xl space-y-6 text-black print:space-y-0">
      {pages.map((rowIdxs, pageIdx) => {
        // Pad each sheet's table to a full height so every sheet looks identical.
        const emptyRowCount = Math.max(0, ROWS_PER_PAGE - rowIdxs.length)

        return (
          <div key={pageIdx} className="doc-page border border-black bg-white p-6 text-xs">
            {/* Header band */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {company?.logo
                  ? <img src={company.logo} alt="logo" className="h-10 w-10 shrink-0 border border-black object-contain" />
                  : <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-black text-center text-[9px] leading-tight">
                      LOGO
                    </div>}
                <div>
                  <div className="text-sm font-bold">{company?.headerName || 'GLOBE SYNDICATE (THAILAND) CO.,LTD.'}</div>
                  <div className="font-bold">{company?.address || DEFAULT_ADDRESS}</div>
                </div>
              </div>
              <div className="shrink-0 border border-black px-3 py-2 text-center text-sm font-bold">
                {settings.title}
              </div>
            </div>
            <div className="mt-2 border-t-2 border-black" />
            {/* รหัสฟอร์ม + เลขหน้า (แสดงเลขหน้าเมื่อมีมากกว่า 1 แผ่น) */}
            {(settings.formCode || totalPages > 1) && (
              <div className="mt-1 flex justify-between">
                <span>{totalPages > 1 ? `หน้า ${pageIdx + 1} / ${totalPages}` : ''}</span>
                <span>{settings.formCode}</span>
              </div>
            )}

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

            {/* ตาราง */}
            <table className="mt-3 w-full table-fixed border-collapse border border-black text-[10px]">
              <thead>
                <tr>
                  <th className="w-8 border border-black px-1 py-1">ลำดับ</th>
                  {vcols.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.width ? `${col.width}px` : undefined }}
                      className="break-words border border-black px-1 py-1"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowIdxs.map(i => (
                  <tr key={i}>
                    <td className="border border-black px-1 py-0.5 text-center">{i + 1}</td>
                    {vcols.map(col => (
                      <td key={col.key} className={`break-words border border-black px-1 py-0.5 ${col.type === 'text' || col.type === 'date' ? '' : 'text-right'}`}>
                        {col.type === 'date'
                          ? formatIsoDate(computed[i][col.key] as string)
                          : col.type === 'text'
                          ? (computed[i][col.key] as string)
                          : money(Number(computed[i][col.key]) || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
                {Array.from({ length: emptyRowCount }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    {Array.from({ length: totalCols }).map((__, j) => (
                      <td key={j} className="border border-black px-1 py-0.5">&nbsp;</td>
                    ))}
                  </tr>
                ))}
                {/* แถวรวม — ยอดรวมทั้งหมด แสดงเหมือนกันทุกแผ่น */}
                <tr className="font-bold">
                  <td className="border border-black px-1 py-1 text-right" colSpan={labelSpan}>รวมทั้งสิ้น</td>
                  {firstNumericIdx >= 0 && vcols.slice(firstNumericIdx).map(col => (
                    <td key={col.key} className="border border-black px-1 py-1 text-right">
                      {col.type === 'text' || col.type === 'date' ? '' : money(columnTotals[col.key] ?? 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* VAT / หัก ณ ที่จ่าย / ยอดสุทธิ */}
            {hasTax && (
              <div className="mt-2 ml-auto w-56 text-[10px]">
                <div className="flex justify-between"><span>ยอดรวม (ก่อนภาษี)</span><span>{money(tax.subtotal)}</span></div>
                {header.vat && <div className="flex justify-between"><span>ภาษีมูลค่าเพิ่ม 7%</span><span>{money(tax.vatAmount)}</span></div>}
                {!!header.whtRate && <div className="flex justify-between"><span>หัก ณ ที่จ่าย {header.whtRate}%</span><span>-{money(tax.whtAmount)}</span></div>}
                <div className="flex justify-between border-t border-black font-bold"><span>ยอดสุทธิ</span><span>{money(tax.netTotal)}</span></div>
              </div>
            )}

            {/* เป็นจำนวนเงิน */}
            <div className="mt-2 border border-black px-2 py-1 text-center">
              เป็นจำนวนเงิน &nbsp; {bahtWords}
            </div>

            {/* Signature blocks — every cell shares the same layout so lines align */}
            <div className="mt-8 grid grid-cols-3 gap-8 text-center">
              <SignatureBlock label="ผู้เบิก" />
              <SignatureBlock label="หัวหน้าแผนก" />
              <SignatureBlock label="ผู้อนุมัติ" approval={approval} />
            </div>
            <div className="mt-8 grid grid-cols-3 gap-8 text-center">
              <SignatureBlock label="ผู้รับเงิน" />
              <SignatureBlock label="ผู้ตรวจสอบ/ฝ่ายบัญชี" />
              <div />
            </div>

            {/* หมายเหตุ — ซ่อนทั้งบล็อกเมื่อไม่มีหมายเหตุ */}
            {notes.length > 0 && (
              <div className="mt-6 text-[9px]">
                <div className="font-bold">หมายเหตุ:</div>
                {notes.map((note, i) => (
                  <div key={i}>{note}</div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
