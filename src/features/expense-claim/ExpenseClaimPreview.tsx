import type { Company, ExpenseHeader, ExpenseRow, FormColumn, FormSettings } from '../../types/schema'
import { EXPENSE_CLAIM_DEFAULTS, formSignatureBlocks, seqColumnWidth, showSeqColumn } from '../../types/schema'
import type { SignatureBlock as SigBlock, DocSignature } from '../../types/schema'
import { isTextCol } from '../../types/schema'
import { computeRow, computeColumnTotals, grandTotal, paginateRows, printBodyMm, rowHasNumbers, rowHeightMm, rowLines, taxBases, taxSummary, tickedRowCount, visibleColumns, printWidthsMm, whtLines, PRINT_TABLE_MM, ROW_VAT_KEY } from './calc'
import { bahtText } from '../../shared/bahttext'
import { formatMoney as money } from '../../shared/money'
import { formatDate, formatIsoDate } from '../../shared/date'
import { parseTemplate, formatTemplateValue, blankFor } from '../../shared/bodyTemplate'
import { FEATURES } from '../../shared/features'
import { textSizeScale } from '../../shared/textSize'

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseRow[]; docNumber: string; settings?: FormSettings; signatures?: DocSignature[] }

const DEFAULT_ADDRESS =
  '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น 6 ถนนพัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ'

// How many rows fit on a sheet is decided by how tall they print — see
// paginateRows and PRINT_ROWS_PER_PAGE in calc. Rows beyond the first sheet
// overflow onto the next (stacked below on screen, a new page when printed),
// and every sheet is a complete form on its own: same header, requester, grand
// total, amount-in-words, signatures and notes.

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
      <div className="mt-2 leading-snug">
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
  // Print a figure only once the row holds one: a row left empty stays empty,
  // the way it would on the paper form, instead of printing 0.00 everywhere.
  const cellMoney = (row: ExpenseRow, col: FormColumn): string => {
    const raw = row[col.key]
    const filled = col.type === 'calc' ? rowHasNumbers(cols, row) : String(raw ?? '').trim() !== ''
    return filled ? money(Number(raw) || 0) : ' '
  }
  const columnTotals = computeColumnTotals(cols, items)
  // Held back for now — see shared/features and the note in the form.
  const scopes = FEATURES.taxPerRow ? { vat: header.vatScope, wht: header.whtScope } : {}
  const onNet = FEATURES.taxOnNet ? { vat: header.vatOnNet, whtRate: header.whtOnNetRate } : undefined
  const bases = taxBases(cols, items, scopes)
  const tax = taxSummary(grandTotal(cols, items), header.vat, header.whtRate, header.retentionRate, bases, onNet)
  const taxedAgain = !!onNet?.vat || !!onNet?.whtRate
  // A tax charged line by line prints what it was worked out from, so the sheet
  // can be checked against its own ticks without adding them up by hand.
  const chargedOn = (byRow: boolean, base: number, key: string) =>
    byRow ? ` (ฐาน ${money(base)} · ${tickedRowCount(items, key)} รายการ)` : ''
  // Which lines a tax was charged on is chosen on the fill-in screen and kept
  // with the document, but not printed: the sheet keeps its own columns, and
  // the summary says what each tax was worked out from and on how many lines.
  const hasTax = !!header.vat || !!header.whtRate || !!header.retentionRate
  const bahtWords = bahtText(tax.netTotal)
  const notes = (settings.notes ?? []).filter(n => (n ?? '').trim() !== '')
  const withSeq = showSeqColumn(settings)
  const totalCols = vcols.length + (withSeq ? 1 : 0) // + the ลำดับ column

  // Widths are millimetres on the sheet (printWidthsMm) rendered as percentages,
  // so the table fills the frame exactly whatever the paper size.
  const mm = printWidthsMm(withSeq ? seqColumnWidth(settings) : 0, vcols.map(c => c.width), PRINT_TABLE_MM)
  const SEQ_WEIGHT = mm.seq
  const widthWeights = mm.cols
  const pct = (w: number) => `${((w / PRINT_TABLE_MM) * 100).toFixed(3)}%`

  // Totals footer: label spans the seq column + leading text columns up to the first visible numeric/calc column.
  const firstNumericIdx = vcols.findIndex(c => !isTextCol(c.type))
  const labelSpan = firstNumericIdx < 0 ? totalCols : firstNumericIdx + (withSeq ? 1 : 0)
  // Forms with no numeric/calc columns (e.g. a work-report) have nothing to sum,
  // so hide the grand-total row and the amount-in-words box.
  const hasNumericCols = firstNumericIdx >= 0

  // Signature blocks (configured per form), laid out in rows of 3.
  const sigBlocks = formSignatureBlocks(settings)
  const sigRows: SigBlock[][] = []
  for (let i = 0; i < sigBlocks.length; i += 3) sigRows.push(sigBlocks.slice(i, i + 3))

  // Sheets are filled by how tall the rows print, not by how many there are:
  // a detail that wraps onto three lines takes three rows' worth of the sheet.
  const printed = (row: ExpenseRow, col: FormColumn): string =>
    col.type === 'date' ? formatIsoDate(row[col.key] as string)
      : isTextCol(col.type) ? String(row[col.key] ?? '')
      : cellMoney(row, col)
  // What was typed into the table prints at the size chosen for it (see
  // shared/textSize) — the printed 10px stretched or shrunk in the same
  // proportion as the screen's 12px. Everything else on the sheet stays put.
  const cellScale = textSizeScale(header.textSize)
  const cellFont = cellScale === 1 ? undefined : { fontSize: `${(10 * cellScale).toFixed(2)}px` }
  const lineCounts = computed.map(r => rowLines(widthWeights, vcols.map(c => printed(r, c)), cellScale))
  // What is left of the sheet once the rest of this particular form has taken
  // its share: a form with two paragraphs, six signature blocks and ten notes
  // has far less room for rows than a bare one, and gets what it actually has.
  const paragraphLines = (text?: string | null) =>
    text?.trim() ? rowLines([PRINT_TABLE_MM], [text]) : 0
  const bodyMm = printBodyMm({
    categoryRows: Math.ceil(settings.categories.filter(Boolean).length / 2),
    showRequester: settings.showRequester !== false,
    headerFields: (settings.headerFields ?? []).length,
    introLines: paragraphLines(settings.introText),
    bodyLines: paragraphLines(settings.bodyText),
    headLines: rowLines(widthWeights, vcols.map(c => c.label)),
    taxLines: hasTax
      // Withholding picked line by line prints a line per rate.
      ? 2 + (header.vat ? 1 : 0) + (header.retentionRate ? 1 : 0)
        + (!header.whtRate ? 0 : scopes.wht === 'rows' ? Math.max(1, whtLines(bases, header.whtRate).length) : 1)
        + (taxedAgain ? 1 + (onNet?.vat ? 1 : 0) + (onNet?.whtRate ? 1 : 0) : 0)
      : 0,
    showAmountWords: hasNumericCols && settings.showAmountWords !== false,
    signatureRows: sigRows.length,
    noteLines: notes.length ? notes.length + 1 : 0,
  })
  const pages = paginateRows(lineCounts.map(n => rowHeightMm(n, cellScale)), bodyMm)
  const totalPages = pages.length

  return (
    <div id="print-area" style={{ fontFamily: "'Sarabun', serif" }} className="mx-auto max-w-3xl space-y-6 text-black print:space-y-0">
      {pages.map((page, pageIdx) => {
        const rowIdxs = page.rows
        // Pad each sheet's table to a full height so every sheet looks identical.

        return (
          <div key={pageIdx} className="doc-page bg-white p-6 text-xs">
            {/* Header band */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {company?.logo
                  ? <img src={company.logo} alt="logo" className="h-10 w-10 shrink-0 object-contain" />
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
              <FilledText className="mt-3 whitespace-pre-line text-justify leading-loose" text={settings.introText} values={header.fields} />
            )}

            {/* ตาราง */}
            <table className="mt-3 w-full table-fixed border-collapse border border-black text-[10px]">
              <thead>
                <tr>
                  {withSeq && <th style={{ width: pct(SEQ_WEIGHT) }} className="border border-black px-1 py-1">ลำดับ</th>}
                  {vcols.map((col, ci) => (
                    <th
                      key={col.key}
                      style={{ width: pct(widthWeights[ci]) }}
                      className="whitespace-pre-line break-words border border-black px-1 py-1 leading-[2]"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowIdxs.map(i => (
                  <tr key={i}>
                    {withSeq && <td style={cellFont} className="border border-black px-1 py-0.5 text-center">{i + 1}</td>}
                    {vcols.map(col => (
                      <td key={col.key} style={cellFont} className={`break-words border border-black px-1 py-0.5 leading-[2] ${isTextCol(col.type) ? '' : 'text-right'}`}>
                        {col.type === 'date'
                          ? formatIsoDate(computed[i][col.key] as string)
                          : isTextCol(col.type)
                          ? (computed[i][col.key] as string)
                          : cellMoney(computed[i], col)}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* No blank rows ruled under the last one: the table ends where
                    the document does, and the space goes to whoever needs it. */}
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
                {header.vat && <div className="flex justify-between"><span>ภาษีมูลค่าเพิ่ม 7%{chargedOn(scopes.vat === 'rows', bases.vat, ROW_VAT_KEY)}</span><span>{money(tax.vatAmount)}</span></div>}
                {!!header.whtRate && scopes.wht !== 'rows' && <div className="flex justify-between"><span>หัก ณ ที่จ่าย {header.whtRate}%</span><span>-{money(tax.whtAmount)}</span></div>}
                {!!header.whtRate && scopes.wht === 'rows' && whtLines(bases, header.whtRate).map(l => (
                  <div key={l.rate} className="flex justify-between"><span>หัก ณ ที่จ่าย {l.rate}% (ฐาน {money(l.base)} · {l.count} รายการ)</span><span>-{money(l.amount)}</span></div>
                ))}
                {!!header.retentionRate && <div className="flex justify-between"><span>หัก {header.retentionRate}% ค่าประกันงาน</span><span>-{money(tax.retentionAmount)}</span></div>}
                {taxedAgain && (
                  <>
                    <div className="flex justify-between border-t border-black"><span>ยอดหลังภาษีชั้นแรก</span><span>{money(tax.netAfterTax)}</span></div>
                    {!!onNet?.vat && <div className="flex justify-between"><span>ภาษีมูลค่าเพิ่ม 7% (จากยอดสุทธิ)</span><span>{money(tax.vatOnNetAmount)}</span></div>}
                    {!!onNet?.whtRate && <div className="flex justify-between"><span>หัก ณ ที่จ่าย {onNet.whtRate}% (จากยอดสุทธิ)</span><span>-{money(tax.whtOnNetAmount)}</span></div>}
                  </>
                )}
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
              <FilledText className="mt-4 whitespace-pre-line text-justify leading-loose" text={settings.bodyText} values={header.fields} />
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
