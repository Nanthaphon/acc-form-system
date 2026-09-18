// Every amount the app shows is money, so it always reads with thousand
// separators and exactly two decimals: 1000.5 is 1,000.50, never 1,000.5.
// One place for it, because the form, the lists, the on-screen document and the
// PDF used to each format their own way and drifted apart.
export function formatMoney(n: number): string {
  return (Number.isFinite(n) ? n : 0)
    .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
