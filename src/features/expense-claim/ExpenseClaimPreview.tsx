import type { Company, ExpenseHeader, ExpenseRow, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS, formSignatureBlocks } from '../../types/schema'
import type { SignatureBlock as SigBlock, DocSignature } from '../../types/schema'
import { isTextCol } from '../../types/schema'
import { computeRow, computeColumnTotals, grandTotal, taxSummary, visibleColumns } from './calc'
import { bahtText } from '../../shared/bahttext'
import { formatMoney as money } from '../../shared/money'
import { formatDate, formatIsoDate } from '../../shared/date'
import { parseTemplate, formatTemplateValue, blankFor } from '../../shared/bodyTemplate'

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseRow[]; docNumber: string; settings?: FormSettings; signatures?: DocSignature[] }

const DEFAULT_ADDRESS =
  '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น6 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ'

// Rows that fit on a single sheet. When items exceed this, they overflow onto
// the next sheet (stacked below on screen, a new page when printed). Every
// sheet is a complete form on its own — same header, requester, grand total,
// amount-in-words, signatures and notes.
const ROWS_PER_PAGE = 14

// A form paragraph with its {{blanks}} filled from the document: typed values
// sit on a dotted line, empty blanks print as dots to be written by hand.
function FilledText({ text, values, className }: { text: string; values?: Record<string, string>; className: string }) {
  return (
    <div className={className}>
      {parseTemplate(text).map((p, i) => {
        if (p.kind === 'text') return <span key={i}>{p.text}</span>
        const v = formatTemplateValue(p.field, values?.[p.field.key])
        return v
          ? <span key={i} className="border-b border-dotted border-black px-1">{v}</span>
          : <span key={i}>{blankFor(p.field)}</span>
      })}
    </div>
  )
}

// One signature cell — fixed-height signing area so all lines and labels line up.
// When the block has a signed online signature, stamp the image + name + date.
function SignatureBlock({ label, sig }: { label: string; sig?: DocSignature }) {
  const signed = sig?.status === 'signed'
  return (
    <div>
      <div className="flex h-10 items-end justify-center border-b border-black">
        {signed && sig?.signatureImage ? <img src={sig.signatureImage} alt="ลายเซ็น" className="max-h-10 object-contain pb-0.5" /> : <>&nbsp;</>}
      </div>
      <div className="mt-1">{label}</div>
      <div className="mt-2 leading-tight">
        {signed
          ? <>({sig?.assignedName})<br />{sig?.signedAt ? `วันที่ ${formatDate(sig.signedAt)}` : ''}</>
          : 'วันที่ ................'}
      </div>
    </div>
  )
}

export default function ExpenseClaimPreview({ company, header, items, settings = EXPENSE_CLAIM_DEFAULTS, signatures }: Props) {
  const cols = settings.columns
  const vcols = visibleColumns(cols)
  const computed = items.map(r => computeRow(cols, r))
  const columnTotals = computeColumnTotals(cols, items)
  const tax = taxSummary(grandTotal(cols, items), header.vat, header.whtRate)
  const hasTax = !!header.vat || !!header.whtRate
  const bahtWords = bahtText(tax.netTotal)
  const notes = (settings.notes ?? []).filter(n => (n ?? '').trim() !== '')
  const totalCols = vcols.length + 1 // + leading seq column

  // Column widths as proportional percentages (not px) so the table always fits
  // the page frame exactly, no matter how many columns or how wide their hints.
  // Columns without a width hint fall back to a default weight.
  const SEQ_WEIGHT = 30
  const widthWeights = vcols.map(c => c.width ?? 70)
  const weightTotal = SEQ_WEIGHT + widthWeights.reduce((a, b) => a + b, 0)
  const pct = (w: number) => `${((w / weightTotal) * 100).toFixed(3)}%`

  // Totals footer: label spans the seq column + leading text columns up to the first visible numeric/calc column.
  const firstNumericIdx = vcols.findIndex(c => !isTextCol(c.type))
  const labelSpan = firstNumericIdx < 0 ? totalCols : firstNumericIdx + 1
  // Forms with no numeric/calc columns (e.g. a work-report) have nothing to sum,
  // so hide the grand-total row and the amount-in-words box.
  const hasNumericCols = firstNumericIdx >= 0

  // Split the row indices into pages of ROWS_PER_PAGE. Always at least one page
  // (so an empty form still renders a blank sheet).
  const pages: number[][] = []
  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    pages.push(Array.from({ length: Math.min(ROWS_PER_PAGE, items.length - i) }, (_, k) => i + k))
  }
  if (pages.length === 0) pages.push([])
  const totalPages = pages.length

  // Signature blocks (configured per form), laid out in rows of 3.
  const sigBlocks = formSignatureBlocks(settings)
  const sigRows: SigBlock[][] = []
  for (let i = 0; i < sigBlocks.length; i += 3) sigRows.push(sigBlocks.slice(i, i + 3))

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

            {/* เรื่อง / เรียน + checkboxes (each hidden when empty) */}
            <div className="mt-2 flex items-start justify-between">
              <div>
                {settings.subject && <div>เรื่อง &nbsp; {settings.subject}</div>}
                {settings.attention && <div>เรียน &nbsp; {settings.attention}</div>}
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
            {settings.showRequester !== false && (
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
            )}

            {/* Custom header fields */}
            {(settings.headerFields ?? []).map(f => (
              <div key={f.id} className="mt-2 flex items-baseline gap-x-2">
                <span>{f.label}</span>
                <span className="min-w-[120px] flex-1 border-b border-black px-1">
                  {f.type === 'date' ? formatIsoDate(header.fields?.[f.id] ?? '') : (header.fields?.[f.id] ?? '')}
                </span>
              </div>
            ))}

            {/* ข้อความหัวฟอร์ม (เหนือตาราง) ถ้ามี */}
            {settings.introText?.trim() && (
              <FilledText className="mt-3 whitespace-pre-line text-justify leading-relaxed" text={settings.introText} values={header.fields} />
            )}

            {/* ตาราง */}
            <table className="mt-3 w-full table-fixed border-collapse border border-black text-[10px]">
              <thead>
                <tr>
                  <th style={{ width: pct(SEQ_WEIGHT) }} className="border border-black px-1 py-1">ลำดับ</th>
                  {vcols.map((col, ci) => (
                    <th
                      key={col.key}
                      style={{ width: pct(widthWeights[ci]) }}
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
                      <td key={col.key} className={`break-words border border-black px-1 py-0.5 ${isTextCol(col.type) ? '' : 'text-right'}`}>
                        {col.type === 'date'
                          ? formatIsoDate(computed[i][col.key] as string)
                          : isTextCol(col.type)
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
                {/* แถวรวม — ยอดรวมทั้งหมด แสดงเหมือนกันทุกแผ่น (ซ่อนถ้าไม่มีคอลัมน์ตัวเลข) */}
                {hasNumericCols && (
                  <tr className="font-bold">
                    <td className="border border-black px-1 py-1 text-right" colSpan={labelSpan}>รวมทั้งสิ้น</td>
                    {vcols.slice(firstNumericIdx).map(col => (
                      <td key={col.key} className="border border-black px-1 py-1 text-right">
                        {isTextCol(col.type) ? '' : money(columnTotals[col.key] ?? 0)}
                      </td>
                    ))}
                  </tr>
                )}
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

            {/* เป็นจำนวนเงิน (ซ่อนถ้าไม่มีคอลัมน์ตัวเลข หรือปิดการแสดง) */}
            {hasNumericCols && settings.showAmountWords !== false && (
              <div className="mt-2 border border-black px-2 py-1 text-center">
                เป็นจำนวนเงิน &nbsp; {bahtWords}
              </div>
            )}

            {/* ข้อความรับรอง / คำประกาศ (ถ้ามี) */}
            {settings.bodyText?.trim() && (
              <FilledText className="mt-4 whitespace-pre-line text-justify leading-relaxed" text={settings.bodyText} values={header.fields} />
            )}

            {/* Signature blocks — configured per form, laid out in rows of 3 */}
            {sigRows.map((row, ri) => (
              <div key={ri} className="mt-8 grid grid-cols-3 gap-8 text-center">
                {row.map(b => <SignatureBlock key={b.id} label={b.label} sig={signatures?.find(x => x.blockId === b.id)} />)}
                {Array.from({ length: 3 - row.length }).map((_, k) => <div key={`e${k}`} />)}
              </div>
            ))}

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
