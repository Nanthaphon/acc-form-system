import type { ExpenseItem, ExpenseTotals } from '../../types/schema'
import { bahtText } from '../../shared/bahttext'

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function computeItem(item: ExpenseItem): ExpenseItem {
  const o = item.overrides || {}
  const amountBeforeWht = o.amountBeforeWht ? item.amountBeforeWht : round2(item.workDays * item.ratePerDay)
  const wht3 = o.wht3 ? item.wht3 : (item.applyWht ? round2(amountBeforeWht * 0.03) : 0)
  const amountNet = o.amountNet ? item.amountNet : round2(amountBeforeWht - wht3)
  return { ...item, amountBeforeWht, wht3, amountNet }
}

export function computeTotals(items: ExpenseItem[]): ExpenseTotals {
  const computed = items.map(computeItem)
  const totalBefore = round2(computed.reduce((s, i) => s + i.amountBeforeWht, 0))
  const totalWht = round2(computed.reduce((s, i) => s + i.wht3, 0))
  const totalNet = round2(computed.reduce((s, i) => s + i.amountNet, 0))
  return { totalBefore, totalWht, totalNet, amountInThaiText: bahtText(totalNet) }
}
