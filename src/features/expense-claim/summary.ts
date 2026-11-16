import type { ExpenseHeader, ExpenseRow, FormColumn } from '../../types/schema'
import { FEATURES } from '../../shared/features'
import { formatMoney as money } from '../../shared/money'
import { retLines, ROW_VAT_KEY, taxBases, taxHeader, taxSubtotal, taxSummary, tickedRowCount, whtInTable, whtLines, whtNettedInTable } from './calc'
import type { TaxBases, TaxResult } from './calc'

/** One line of the tax summary under the table. `minus`: taken off, printed as -amount. */
export interface SummaryLine { label: string; amount: number; minus?: boolean; rule?: boolean; bold?: boolean }

export interface DocumentSummary {
  /** The document's header with withholding the table already works out taken off. */
  header: ExpenseHeader
  tax: TaxResult
  bases: TaxBases
  scopes: { vat?: ExpenseHeader['vatScope']; wht?: ExpenseHeader['whtScope']; ret?: ExpenseHeader['retentionScope'] }
  /** Withholding worked out in the table's own column, shown as one summary line. */
  tableWht: boolean
  /** A second round of tax charged on the net. */
  taxedAgain: boolean
  onNet?: { vat?: boolean; whtRate?: number }
  /** Is there a tax summary at all. */
  hasTax: boolean
  /** The summary, top to bottom — empty when hasTax is false. */
  lines: SummaryLine[]
}

// The figures under a document's table — what the printed sheet and the Excel
// export both show, worked out in one place so the two can never disagree.
export function documentSummary(cols: FormColumn[], given: ExpenseHeader, items: ExpenseRow[]): DocumentSummary {
  // Withholding worked out in the table's own columns is not taken off again below it.
  const header = taxHeader(cols, given)
  // Held back for now — see shared/features and the note in the form.
  const scopes = FEATURES.taxPerRow ? { vat: header.vatScope, wht: header.whtScope, ret: header.retentionScope } : {}
  const onNet = FEATURES.taxOnNet ? { vat: header.vatOnNet, whtRate: header.whtOnNetRate } : undefined
  const bases = taxBases(cols, items, scopes)
  const tax = taxSummary(taxSubtotal(cols, items), header.vat, header.whtRate, header.retentionRate, bases, onNet)
  // Withholding the table worked out goes in the summary as one line, when there is a summary.
  const tableWht = whtInTable(cols) && tax.whtAmount > 0
  const taxedAgain = !!onNet?.vat || !!onNet?.whtRate
  // A tax charged line by line prints what it was worked out from, so the sheet
  // can be checked against its own ticks without adding them up by hand.
  const chargedOn = (byRow: boolean, base: number, key: string) =>
    byRow ? ` (ฐาน ${money(base)} · ${tickedRowCount(items, key)} รายการ)` : ''
  // Withholding the table took but its own total does not show (the total
  // column is the amount before it) is explained in the summary too — or the
  // sheet's รวมทั้งสิ้น and its amount in words would not agree.
  const hasTax = !!header.vat || !!header.whtRate || !!header.retentionRate || (tableWht && !whtNettedInTable(cols))

  const lines: SummaryLine[] = []
  if (hasTax) {
    lines.push({ label: 'ยอดรวม (ก่อนภาษี)', amount: tax.subtotal })
    if (header.vat) lines.push({ label: `ภาษีมูลค่าเพิ่ม 7%${chargedOn(scopes.vat === 'rows', bases.vat, ROW_VAT_KEY)}`, amount: tax.vatAmount })
    if (tableWht) lines.push({ label: 'หัก ณ ที่จ่าย (ตามรายการ)', amount: tax.whtAmount, minus: true })
    if (header.whtRate && scopes.wht !== 'rows') lines.push({ label: `หัก ณ ที่จ่าย ${header.whtRate}%`, amount: tax.whtAmount, minus: true })
    if (header.whtRate && scopes.wht === 'rows') {
      for (const l of whtLines(bases, header.whtRate)) {
        lines.push({ label: `หัก ณ ที่จ่าย ${l.rate}% (ฐาน ${money(l.base)} · ${l.count} รายการ)`, amount: l.amount, minus: true })
      }
    }
    if (header.retentionRate && scopes.ret !== 'rows') lines.push({ label: `หัก ${header.retentionRate}% ค่าประกันงาน`, amount: tax.retentionAmount, minus: true })
    if (header.retentionRate && scopes.ret === 'rows') {
      for (const l of retLines(bases)) {
        lines.push({ label: `หัก ${l.rate}% ค่าประกันงาน (ฐาน ${money(l.base)} · ${l.count} รายการ)`, amount: l.amount, minus: true })
      }
    }
    if (taxedAgain) {
      lines.push({ label: 'ยอดหลังภาษีชั้นแรก', amount: tax.netAfterTax, rule: true })
      if (onNet?.vat) lines.push({ label: 'ภาษีมูลค่าเพิ่ม 7% (จากยอดสุทธิ)', amount: tax.vatOnNetAmount })
      if (onNet?.whtRate) lines.push({ label: `หัก ณ ที่จ่าย ${onNet.whtRate}% (จากยอดสุทธิ)`, amount: tax.whtOnNetAmount, minus: true })
    }
    lines.push({ label: 'ยอดสุทธิ', amount: tax.netTotal, rule: true, bold: true })
  }

  return { header, tax, bases, scopes, tableWht, taxedAgain, onNet, hasTax, lines }
}
