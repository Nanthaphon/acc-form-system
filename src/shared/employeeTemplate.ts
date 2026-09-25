import { columnLetter, writeXlsx } from './xlsxWrite'
import type { Sheet, Style, Validation } from './xlsxWrite'

// The employee import template, built from this system's own lists at the
// moment it is downloaded, so its dropdowns offer exactly what the importer
// accepts today.
//
// One sheet is all a person sees. The dropdowns still need their values to
// live somewhere in the file, so those sit on a second, hidden sheet — out of
// the tab bar, but there for Excel to read.

export interface TemplateLists {
  companies: { id: string; name: string; shortName?: string | null }[]
  groups: { id: string; name: string }[]
}

export const DATA_SHEET = 'พนักงาน'
const LIST_SHEET = 'ตัวเลือก'
const LAST_ROW = 1000 // how far down the dropdowns reach

interface Column {
  key: string
  width: number
  required: boolean
  /** Digits that are an identifier, not an amount — kept as text so Excel
   *  cannot turn 0012345 into 12345, or an account number into 9.87E+11. */
  text?: boolean
}

// Exactly the headers src/shared/csv.ts reads. แผนก and ตำแหน่ง have no
// dropdown: both are free text, in the file as everywhere else.
const COLUMNS: Column[] = [
  { key: 'employeeId', width: 14, required: true, text: true },
  { key: 'firstName', width: 16, required: true },
  { key: 'lastName', width: 18, required: true },
  { key: 'companyId', width: 18, required: true },
  { key: 'position', width: 26, required: false },
  { key: 'department', width: 24, required: false },
  { key: 'defaultJob', width: 16, required: false },
  { key: 'bankAccount', width: 18, required: false, text: true },
  { key: 'role', width: 12, required: false },
  { key: 'accessGroup', width: 16, required: false },
]

/** The value a person picks for a company: the name they know it by. The
 *  importer accepts it and stores the company's code. */
const companyLabel = (c: TemplateLists['companies'][number]) => c.shortName?.trim() || c.id

function lists(l: TemplateLists) {
  return [
    { key: 'role', values: ['employee', 'admin'] },
    { key: 'companyId', values: l.companies.map(companyLabel) },
    { key: 'accessGroup', values: l.groups.map(g => g.name) },
  ].filter(list => list.values.length > 0)
}

function dataSheet(l: TemplateLists): Sheet {
  const col = (key: string) => columnLetter(COLUMNS.findIndex(c => c.key === key))
  const range = (key: string) => `${col(key)}2:${col(key)}${LAST_ROW}`

  const validations: Validation[] = [{
    sqref: range('employeeId'), type: 'minLength', formula: '6',
    errorTitle: 'รหัสพนักงานสั้นเกินไป',
    error: 'รหัสพนักงานถูกใช้เป็นรหัสผ่านเริ่มต้นด้วย จึงต้องยาวอย่างน้อย 6 ตัวอักษร',
  }]
  lists(l).forEach((list, i) => {
    const letter = columnLetter(i)
    // role has exactly two values, so anything else is refused. Companies and
    // groups can be added after the file is downloaded, so an unlisted one
    // only warns — the importer checks it against the live list anyway.
    const strict = list.key === 'role'
    validations.push({
      sqref: range(list.key), type: 'list',
      formula: `'${LIST_SHEET}'!$${letter}$2:$${letter}$${1 + list.values.length}`,
      alert: strict ? 'stop' : 'warning',
      errorTitle: strict ? 'สิทธิ์ไม่ถูกต้อง' : 'ไม่อยู่ในรายการ',
      error: strict
        ? 'role ต้องเป็น employee หรือ admin เท่านั้น (เว้นว่าง = employee)'
        : 'ค่านี้ไม่อยู่ในรายการของระบบ ตอนนำเข้าระบบจะแจ้งถ้าไม่พบ — กด Yes ถ้าต้องการใช้ค่านี้ต่อ',
    })
  })

  const style = (c: Column): Style | undefined =>
    c.required && c.text ? 'reqText' : c.required ? 'req' : c.text ? 'text' : undefined

  return {
    name: DATA_SHEET,
    freezeFirstRow: true,
    cols: COLUMNS.map(c => ({ width: c.width, style: style(c) })),
    rows: [COLUMNS.map(c => ({ v: c.key, s: 'head' as const }))],
    rowHeights: { 1: 22 },
    validations,
  }
}

function listSheet(l: TemplateLists): Sheet {
  const all = lists(l)
  const height = Math.max(...all.map(list => list.values.length))
  const rows = [all.map(list => ({ v: list.key, s: 'headLeft' as Style }))]
  for (let r = 0; r < height; r++) rows.push(all.map(list => ({ v: list.values[r] ?? '', s: 'text' as Style })))
  return { name: LIST_SHEET, hidden: true, cols: all.map(() => ({ width: 20 })), rows }
}

export async function buildEmployeeTemplate(l: TemplateLists): Promise<Uint8Array> {
  return writeXlsx([dataSheet(l), listSheet(l)])
}

export { XLSX_MIME as TEMPLATE_MIME } from './xlsxWrite'
