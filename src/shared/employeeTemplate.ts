import { columnLetter, writeXlsx } from './xlsxWrite'
import type { Cell, Sheet, Style, Validation } from './xlsxWrite'

// The employee import template, built from this system's own lists at the
// moment it is downloaded. Every dropdown in it offers exactly what the
// importer accepts today — not what was true when a file was last generated.

export interface TemplateLists {
  companies: { id: string; name: string }[]
  groups: { id: string; name: string }[]
  departments: string[]
  positions: string[]
}

export const DATA_SHEET = 'พนักงาน'
const HELP_SHEET = 'คำอธิบาย'
const LIST_SHEET = 'ตัวเลือก'
const LAST_ROW = 1000 // how far down the dropdowns reach

const ROLES: [string, string][] = [
  ['employee', 'พนักงานทั่วไป — สร้าง/แก้/พิมพ์เอกสารของตัวเอง'],
  ['admin', 'Account Admin — จัดการพนักงาน แบบฟอร์ม และเห็นเอกสารทุกคน'],
]

interface Column {
  key: string
  width: number
  required: boolean
  /** Digits that are an identifier, not an amount — kept as text. */
  text?: boolean
  what: string
  example: string
  rule: string
}

function columns(l: TemplateLists): Column[] {
  const listed = (label: string, list: string[]) => list.length > 0
    ? `เลือกจากรายการ (มี ${list.length} ค่า ตั้งไว้ที่เมนู Custom Field) · เว้นว่างได้`
    : `พิมพ์ได้อิสระ · ถ้าอยากให้เป็นรายการให้เลือก ตั้งค่า${label}ได้ที่เมนู Custom Field`
  return [
    { key: 'employeeId', width: 14, required: true, text: true,
      what: 'รหัสพนักงาน — ใช้เป็น "ชื่อผู้ใช้" ตอนเข้าระบบ และเป็น "รหัสผ่านเริ่มต้น" ด้วย', example: '1020001',
      rule: 'ยาวอย่างน้อย 6 ตัวอักษร · ห้ามซ้ำกับพนักงานที่มีอยู่แล้ว' },
    { key: 'firstName', width: 14, required: true, what: 'ชื่อ', example: 'สมหญิง', rule: '—' },
    { key: 'lastName', width: 14, required: true, what: 'นามสกุล', example: 'รักงาน', rule: '—' },
    { key: 'companyId', width: 12, required: true, what: 'รหัสบริษัท (ไม่ใช่ชื่อบริษัท)',
      example: l.companies[0]?.id ?? 'globe', rule: 'เลือกจากรายการ' },
    { key: 'position', width: 18, required: false, what: 'ตำแหน่ง — ขึ้นบนเอกสารที่พิมพ์ออกมา',
      example: l.positions[0] ?? 'เจ้าหน้าที่บัญชี', rule: listed('ตำแหน่ง', l.positions) },
    { key: 'department', width: 16, required: false, what: 'แผนก',
      example: l.departments[0] ?? 'Payroll', rule: listed('แผนก', l.departments) },
    { key: 'defaultJob', width: 16, required: false, what: 'Job ที่ระบบเติมให้อัตโนมัติตอนพนักงานสร้างเอกสาร',
      example: 'งานบัญชีทั่วไป', rule: 'เว้นว่างได้ · พนักงานแก้เองได้ตอนสร้างเอกสาร' },
    { key: 'bankAccount', width: 18, required: false, text: true, what: 'เลขบัญชีธนาคาร',
      example: '123-4-56789-0', rule: 'เว้นว่างได้ · เป็นข้อมูลส่วนบุคคล กรอกเท่าที่จำเป็น' },
    { key: 'role', width: 12, required: false, what: 'สิทธิ์การใช้งาน',
      example: 'employee', rule: 'เลือก employee หรือ admin · เว้นว่าง = employee' },
    { key: 'accessGroup', width: 16, required: false, what: 'กลุ่มที่กำหนดว่าเห็นแบบฟอร์มไหน',
      example: l.groups[0]?.name ?? '', rule: 'เลือกชื่อกลุ่มจากรายการ · เว้นว่าง = เห็นเฉพาะแบบฟอร์มที่เปิดให้ทุกคน' },
  ]
}

/** The lists on the ตัวเลือก sheet, left to right. Empty ones are left out:
 *  a column with no values would only be a dropdown with nothing in it. */
function optionLists(l: TemplateLists): { key: string; width: number; values: string[] }[] {
  return [
    { key: 'role', width: 14, values: ROLES.map(r => r[0]) },
    { key: 'companyId', width: 14, values: l.companies.map(c => c.id) },
    { key: 'accessGroup', width: 18, values: l.groups.map(g => g.name) },
    { key: 'department', width: 20, values: l.departments },
    { key: 'position', width: 22, values: l.positions },
  ].filter(list => list.values.length > 0)
}

function dataSheet(cols: Column[], lists: ReturnType<typeof optionLists>): Sheet {
  const colOf = (key: string) => columnLetter(cols.findIndex(c => c.key === key))
  const rangeOf = (key: string) => `${colOf(key)}2:${colOf(key)}${LAST_ROW}`

  const validations: Validation[] = [{
    sqref: rangeOf('employeeId'), type: 'minLength', formula: '6',
    errorTitle: 'รหัสพนักงานสั้นเกินไป',
    error: 'รหัสพนักงานถูกใช้เป็นรหัสผ่านเริ่มต้นด้วย จึงต้องยาวอย่างน้อย 6 ตัวอักษร',
  }]
  lists.forEach((list, i) => {
    const letter = columnLetter(i)
    // role has exactly two values, so anything else is refused. Every other
    // list can grow after this file is downloaded, so an unlisted value only
    // gets a warning — the importer checks it against the live list anyway.
    const strict = list.key === 'role'
    validations.push({
      sqref: rangeOf(list.key), type: 'list',
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
    cols: cols.map(c => ({ width: c.width, style: style(c) })),
    rows: [cols.map(c => ({ v: c.key, s: 'head' as const }))],
    rowHeights: { 1: 22 },
    validations,
  }
}

function helpSheet(cols: Column[]): Sheet {
  const rows: (Cell | string | null)[][] = [
    [{ v: 'วิธีใช้ไฟล์นี้', s: 'title' }],
    [{ v: '1.', s: 'wrap' }, { v: `กรอกข้อมูลในชีต "${DATA_SHEET}" เริ่มที่แถวที่ 2 — หนึ่งแถวคือพนักงานหนึ่งคน`, s: 'wrap' }],
    [{ v: '2.', s: 'wrap' }, { v: 'ห้ามแก้ชื่อหัวคอลัมน์ในแถวที่ 1 ระบบใช้ชื่อเหล่านี้หาข้อมูล', s: 'wrap' }],
    [{ v: '3.', s: 'wrap' }, { v: 'ช่องพื้นสีเหลืองคือช่องที่บังคับกรอก · ช่องที่มีลูกศรคือให้เลือกจากรายการ', s: 'wrap' }],
    [{ v: '4.', s: 'step' }, { v: 'บันทึกไฟล์ตามปกติ (Ctrl+S) เป็น .xlsx ได้เลย ไม่ต้องแปลงเป็น CSV', s: 'step' }],
    [{ v: '5.', s: 'wrap' }, { v: 'อัปโหลดที่ เมนูพนักงาน > นำเข้าพนักงาน — ระบบให้ตรวจทานก่อน ยังไม่สร้างบัญชีทันที', s: 'wrap' }],
    [],
    ['คอลัมน์', 'บังคับกรอก?', 'คืออะไร', 'ตัวอย่าง', 'กฎและข้อควรระวัง'].map(v => ({ v, s: 'headLeft' as const })),
    ...cols.map(c => [
      { v: c.key, s: 'bold' as const },
      { v: c.required ? 'บังคับ' : 'ไม่บังคับ', s: c.required ? 'reqLabel' as const : 'muted' as const },
      { v: c.what, s: 'wrap' as const },
      { v: c.example || '(เว้นว่างได้)', s: 'wrap' as const },
      { v: c.rule, s: 'wrap' as const },
    ]),
  ]
  return {
    name: HELP_SHEET,
    cols: [{ width: 16 }, { width: 12 }, { width: 46 }, { width: 20 }, { width: 58 }],
    rows,
    rowHeights: { 1: 24, 8: 20 },
  }
}

function listSheet(l: TemplateLists, lists: ReturnType<typeof optionLists>): Sheet {
  const height = Math.max(...lists.map(list => list.values.length))
  const rows: (Cell | string | null)[][] = [lists.map(list => ({ v: list.key, s: 'headLeft' as const }))]
  for (let r = 0; r < height; r++) rows.push(lists.map(list => ({ v: list.values[r] ?? '', s: 'text' as const })))

  // Under the table, because the table itself has to stay just the values —
  // anything written inside a column would become an option in its dropdown.
  rows.push([])
  rows.push([{ v: 'ค่าที่อยู่ในชีตนี้ คือค่าที่เลือกได้ใน Dropdown ของชีตพนักงาน', s: 'section' }])
  rows.push([{ v: 'role — admin คือ Account Admin (จัดการพนักงานและแบบฟอร์มได้) · employee คือพนักงานทั่วไป', s: 'note' }])
  for (const c of l.companies) rows.push([{ v: `companyId — ${c.id} คือ ${c.name}`, s: 'note' }])
  rows.push([{ v: 'รายการแผนก ตำแหน่ง และกลุ่ม มาจากระบบ ณ ตอนที่ดาวน์โหลดไฟล์นี้ — ถ้ามีการเพิ่มใหม่ ให้ดาวน์โหลดไฟล์ใหม่', s: 'note' }])

  return { name: LIST_SHEET, cols: lists.map(list => ({ width: list.width })), rows, rowHeights: { 1: 20 } }
}

export async function buildEmployeeTemplate(l: TemplateLists): Promise<Uint8Array> {
  const cols = columns(l)
  const lists = optionLists(l)
  return writeXlsx([dataSheet(cols, lists), helpSheet(cols), listSheet(l, lists)])
}
export { XLSX_MIME as TEMPLATE_MIME } from './xlsxWrite'
