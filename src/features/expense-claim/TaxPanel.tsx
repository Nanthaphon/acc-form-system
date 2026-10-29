import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ExpenseHeader, ExpenseRow, FormColumn, TaxScope } from '../../types/schema'
import { retLines, rowHasNumbers, tickedRowCount, whtLines, ROW_VAT_KEY, STANDARD_WHT, TICK, WHT_PRESETS } from './calc'
import type { RateLine, TaxBases, TaxResult } from './calc'
import { bahtText } from '../../shared/bahttext'
import { formatMoney as fmt } from '../../shared/money'
import { FEATURES } from '../../shared/features'

// The taxes on a document, one row each: a switch, the choices for that tax,
// and what it comes to, side by side — so a row says what was set and what it
// cost without matching it up against a list further down.

const STANDARD_RETENTION = 5            // % — the usual ค่าประกันงาน held back

const NUMBER_BOX = 'w-16 rounded-md border border-stone-200 bg-white px-2 py-1 text-right text-sm focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100'
const SELECT_BOX = 'rounded-md border border-stone-200 bg-white px-2 py-1 text-sm focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-100'

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-clay-600/30 ${on ? 'bg-clay-600' : 'bg-stone-300'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

// Whether a tax is charged on the whole document or on some of its lines.
function ScopePicker({ value, onChange, label }: { value?: TaxScope; onChange: (v: TaxScope) => void; label: string }) {
  const scope: TaxScope = value === 'rows' ? 'rows' : 'all'
  return (
    <span role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-stone-200 bg-white text-xs">
      {([['all', 'ทั้งเอกสาร'], ['rows', 'บางรายการ']] as const).map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={scope === v}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 transition-colors ${scope === v ? 'bg-clay-600 font-medium text-white' : 'text-stone-500 hover:bg-stone-50'}`}
        >
          {text}
        </button>
      ))}
    </span>
  )
}

// One tax: switch and name on the left, its choices next, its amount on the
// right. Anything about it that needs a second line goes underneath.
function TaxRow({ name, on, onToggle, amount, children, below }: {
  name: string; on: boolean; onToggle: (on: boolean) => void
  amount?: ReactNode; children?: ReactNode; below?: ReactNode
}) {
  return (
    <div data-tax-row className="border-b border-stone-200/70 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Switch on={on} onChange={onToggle} label={name} />
        <span className={`w-36 text-sm ${on ? 'font-medium text-stone-900' : 'text-stone-500'}`}>{name}</span>
        {on ? children : <span className="text-xs text-stone-400">ปิดอยู่</span>}
        {on && amount !== undefined && <span className="ml-auto text-sm tabular-nums">{amount}</span>}
      </div>
      {on && below && <div className="mt-2 pl-12 text-xs">{below}</div>}
    </div>
  )
}

export default function TaxPanel({ header, onHeaderChange, items, onItemsChange, cols, tax, bases, taxedAgain, whtInTable = false }: {
  header: ExpenseHeader
  onHeaderChange: (h: ExpenseHeader) => void
  items: ExpenseRow[]
  onItemsChange: (rows: ExpenseRow[]) => void
  cols: FormColumn[]
  tax: TaxResult
  bases: TaxBases
  taxedAgain: boolean
  /** The form works หัก ณ ที่จ่าย out in its own columns: no switch for it here. */
  whtInTable?: boolean
}) {
  const vatByRow = FEATURES.taxPerRow && !!header.vat && header.vatScope === 'rows'
  const whtByRow = FEATURES.taxPerRow && !!header.whtRate && header.whtScope === 'rows'

  // `whtOther` holds the typed rate while อื่นๆ is picked — empty or half-typed,
  // which the numeric header.whtRate can't represent.
  const [whtOther, setWhtOther] = useState<string | null>(null)
  const whtOn = !!header.whtRate || whtOther !== null
  const whtChoice = whtOther !== null || (!!header.whtRate && !WHT_PRESETS.includes(header.whtRate)) ? 'other' : String(header.whtRate || STANDARD_WHT)

  // Withholding stays switched on by its rate, which also stands for lines
  // ticked before each line had a rate of its own — so it must not fall to 0.
  const setScope = (k: 'vatScope' | 'whtScope' | 'retentionScope', v: TaxScope) => {
    setWhtOther(null)
    onHeaderChange({ ...header, [k]: v, ...(k === 'whtScope' ? { whtRate: header.whtRate || STANDARD_WHT } : {}) })
  }

  const retByRow = FEATURES.taxPerRow && !!header.retentionRate && header.retentionScope === 'rows'

  const lines = items.filter(r => rowHasNumbers(cols, r)).length

  // Under a tax whose rate is chosen line by line: a line per rate, with what
  // it was worked out on — or a warning while no line has a rate.
  const byRateHint = (name: string, column: string, rateLines: RateLine[]) => rateLines.length === 0
    ? <span className="text-ochre-700">ยังไม่ได้เลือกรายการ — เลือกอัตราในคอลัมน์ "{column}" ของตาราง</span>
    : (
      <div className="space-y-0.5">
        {rateLines.map(l => (
          <div key={l.rate} className="flex justify-between text-stone-600">
            <span>{name} {l.rate}% (จาก {fmt(l.base)} · {l.count} รายการ)</span>
            {/* One rate is the row's own amount already; several are each shown. */}
            {rateLines.length > 1 && <span className="tabular-nums text-brick-600">−{fmt(l.amount)}</span>}
          </div>
        ))}
      </div>
    )

  // Under a tax picked by tick: where the ticks go, how many there are, and a
  // way to tick every line at once — or a warning while there are none.
  const pickHint = (column: string, key: string) => {
    const picked = tickedRowCount(items, key)
    if (picked === 0) return <span className="text-ochre-700">ยังไม่ได้เลือกรายการ — ติ๊กในคอลัมน์ "{column}" ของตาราง</span>
    return (
      <span className="text-clay-700">
        ↑ ติ๊กในคอลัมน์ "{column}" ของตาราง · เลือกแล้ว {picked} จาก {lines} รายการ
        {picked < items.length && (
          <> · <button type="button" className="underline underline-offset-2 hover:text-clay-900"
            onClick={() => onItemsChange(items.map(r => ({ ...r, [key]: TICK })))}>เลือกทั้งหมด</button></>
        )}
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-2">
      <TaxRow
        name="ภาษีมูลค่าเพิ่ม 7%"
        on={!!header.vat}
        onToggle={on => onHeaderChange({ ...header, vat: on })}
        amount={<span className="text-stone-700">+{fmt(tax.vatAmount)}</span>}
        below={vatByRow && pickHint('VAT 7%', ROW_VAT_KEY)}
      >
        {FEATURES.taxPerRow && <ScopePicker value={header.vatScope} onChange={v => setScope('vatScope', v)} label="ขอบเขต VAT" />}
      </TaxRow>

      {!whtInTable && <TaxRow
        name="หัก ณ ที่จ่าย"
        on={whtOn}
        onToggle={on => { setWhtOther(null); onHeaderChange({ ...header, whtRate: on ? STANDARD_WHT : 0 }) }}
        amount={<span className="text-brick-600">−{fmt(tax.whtAmount)}</span>}
        below={whtByRow && byRateHint('หัก ณ ที่จ่าย', 'หัก ณ ที่จ่าย', whtLines(bases, header.whtRate))}
      >
        {whtByRow ? (
          <span className="text-xs text-stone-500">อัตราเลือกในตาราง</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <select
              aria-label="อัตราหัก ณ ที่จ่าย"
              className={SELECT_BOX}
              value={whtChoice}
              onChange={e => {
                const v = e.target.value
                if (v === 'other') { setWhtOther(''); return }
                setWhtOther(null)
                onHeaderChange({ ...header, whtRate: Number(v) })
              }}
            >
              {WHT_PRESETS.map(r => <option key={r} value={String(r)}>{r}%</option>)}
              <option value="other">อื่นๆ</option>
            </select>
            {whtChoice === 'other' && (
              <span className="flex items-center gap-1 text-sm text-stone-500">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  autoFocus={whtOther === ''}
                  placeholder="เช่น 1.5"
                  aria-label="อัตราหัก ณ ที่จ่าย (%)"
                  className={NUMBER_BOX}
                  value={whtOther ?? String(header.whtRate ?? '')}
                  onChange={e => {
                    const v = e.target.value
                    setWhtOther(v)
                    const n = Number(v)
                    onHeaderChange({ ...header, whtRate: v.trim() !== '' && Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 0 })
                  }}
                />
                %
              </span>
            )}
          </span>
        )}
        {FEATURES.taxPerRow && <ScopePicker value={header.whtScope} onChange={v => setScope('whtScope', v)} label="ขอบเขตหัก ณ ที่จ่าย" />}
      </TaxRow>}

      <TaxRow
        name="ค่าประกันงาน"
        on={!!header.retentionRate}
        onToggle={on => onHeaderChange({ ...header, retentionRate: on ? STANDARD_RETENTION : 0 })}
        amount={<span className="text-brick-600">−{fmt(tax.retentionAmount)}</span>}
        below={retByRow && byRateHint('ค่าประกันงาน', 'ประกันงาน', retLines(bases))}
      >
        {retByRow ? (
          <span className="text-xs text-stone-500">อัตราเลือกในตาราง</span>
        ) : (
          <span className="flex items-center gap-1 text-sm text-stone-500">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.01"
              aria-label="อัตราค่าประกันงาน (%)"
              className={NUMBER_BOX}
              value={header.retentionRate}
              onChange={e => {
                const n = Number(e.target.value)
                onHeaderChange({ ...header, retentionRate: Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 0 })
              }}
            />
            % ของยอดก่อนภาษี
          </span>
        )}
        {FEATURES.taxPerRow && <ScopePicker value={header.retentionScope} onChange={v => setScope('retentionScope', v)} label="ขอบเขตค่าประกันงาน" />}
      </TaxRow>

      {FEATURES.taxOnNet && (!!header.vat || whtOn || !!header.retentionRate) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone-200/70 py-3 text-sm text-stone-600">
          <span className="text-xs font-medium text-stone-500" title="คิดภาษีอีกชั้นจากยอดสุทธิ ไม่ใช่จากยอดรายการ — สำหรับเอกสารที่นำยอดที่คิดภาษีแล้วไปคิดภาษีต่อทั้งก้อน">
            คิดซ้ำจากยอดสุทธิอีกชั้น
          </span>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={!!header.vatOnNet} onChange={e => onHeaderChange({ ...header, vatOnNet: e.target.checked })} />
            VAT 7%
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={!!header.whtOnNetRate} onChange={e => onHeaderChange({ ...header, whtOnNetRate: e.target.checked ? 3 : 0 })} />
            หัก ณ ที่จ่าย
          </label>
          {!!header.whtOnNetRate && (
            <span className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                aria-label="อัตราหัก ณ ที่จ่ายจากยอดสุทธิ (%)"
                className={NUMBER_BOX}
                value={header.whtOnNetRate}
                onChange={e => {
                  const n = Number(e.target.value)
                  onHeaderChange({ ...header, whtOnNetRate: Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 0 })
                }}
              />
              %
            </span>
          )}
        </div>
      )}

      <div className="space-y-1 border-t border-stone-300 py-3 text-sm">
        <div className="flex justify-between text-stone-600"><span>ยอดรวมก่อนภาษี</span><span className="tabular-nums">{fmt(tax.subtotal)}</span></div>
        {taxedAgain && (
          <>
            <div className="flex justify-between font-medium text-stone-700">
              <span>ยอดหลังภาษีชั้นแรก</span><span>{fmt(tax.netAfterTax)}</span>
            </div>
            {!!header.vatOnNet && (
              <div className="flex justify-between text-stone-600">
                <span>ภาษีมูลค่าเพิ่ม 7% (จากยอด {fmt(tax.netAfterTax)})</span><span>+{fmt(tax.vatOnNetAmount)}</span>
              </div>
            )}
            {!!header.whtOnNetRate && (
              <div className="flex justify-between text-brick-600">
                <span>หัก ณ ที่จ่าย {header.whtOnNetRate}% (จากยอด {fmt(tax.netAfterTax)})</span><span>−{fmt(tax.whtOnNetAmount)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex items-baseline justify-between pt-1 text-stone-900">
          <span className="text-base font-semibold">ยอดสุทธิ</span>
          <span className="text-lg font-semibold tabular-nums">{fmt(tax.netTotal)} บาท</span>
        </div>
        <div className="text-xs text-stone-500">{`(${bahtText(tax.netTotal)})`}</div>
      </div>
    </div>
  )
}
