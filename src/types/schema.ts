export type Role = 'employee' | 'admin'

export interface Company { id: string; name: string; address: string; logo?: string | null; headerName?: string | null }

// ===== Dynamic column model =====
export type ColumnType = 'text' | 'number' | 'calc'
export interface CalcDef {
  op: 'multiply' | 'subtract' | 'add' | 'percent'
  operands?: string[]   // list of column keys (2+) for multiply/add/subtract
  a?: string             // legacy single operand (percent uses this or operands[0])
  b?: string             // legacy second operand
  percent?: number       // for op==='percent'
}

// Returns the operand column keys for a calc def: prefers the new `operands`
// list, falling back to the legacy single `a`/`b` pair for backward compatibility.
export function calcOperands(def: CalcDef): string[] {
  if (def.operands && def.operands.length) return def.operands
  return [def.a, def.b].filter((x): x is string => !!x)
}
export interface FormColumn {
  key: string          // stable id, unique within the form
  label: string
  type: ColumnType
  calc?: CalcDef       // required when type==='calc'; references other columns by key
  isTotal?: boolean    // the column whose column-sum becomes the Thai baht text (exactly one should be true)
  hidden?: boolean     // undefined/false = visible; hidden columns still compute but are not displayed
}

// One row of the dynamic table, keyed by column.key
export type ExpenseRow = Record<string, string | number>

export interface FormGroup { id: string; name: string; sortOrder: number; createdAt: number }

export interface FormSettings {
  formType: string; title: string; subject: string; attention: string; formCode: string
  categories: string[]; notes: string[]
  columns: FormColumn[]
  groupId?: string; name?: string
}

export const EXPENSE_CLAIM_DEFAULT_COLUMNS: FormColumn[] = [
  { key: 'date', label: 'วันเดือนปี', type: 'text' },
  { key: 'pcCode', label: 'PC Code', type: 'text' },
  { key: 'pcName', label: 'PC Name', type: 'text' },
  { key: 'workDays', label: 'วันทำงาน', type: 'number' },
  { key: 'ratePerDay', label: 'วันละ', type: 'number' },
  { key: 'bankAccount', label: 'ธนาคาร', type: 'text' },
  { key: 'pcType', label: 'ประเภทพีซี', type: 'text' },
  { key: 'job', label: 'Job', type: 'text' },
  { key: 'amountBeforeWht', label: 'จำนวนเงินก่อนหัก', type: 'calc', calc: { op: 'multiply', a: 'workDays', b: 'ratePerDay' } },
  { key: 'wht3', label: 'หักภาษี ณ ที่จ่าย 3%', type: 'calc', calc: { op: 'percent', a: 'amountBeforeWht', percent: 3 } },
  { key: 'amountNet', label: 'จำนวนเงินรวม', type: 'calc', calc: { op: 'subtract', a: 'amountBeforeWht', b: 'wht3' }, isTotal: true },
]

export const EXPENSE_CLAIM_DEFAULTS: FormSettings = {
  formType: 'expense-claim',
  name: 'ใบเบิกค่าใช้จ่าย',
  groupId: 'default',
  title: 'ใบขออนุมัติเบิกค่าใช้จ่าย',
  subject: 'ขออนุมัติเบิกค่าใช้จ่าย',
  attention: 'ท่านผู้จัดการ',
  formCode: 'GAC6709-003',
  categories: [
    'ค่าไมล์เลทและค่าใช้จ่ายเดินทาง',
    'ค่าใช้จ่ายต่างๆ',
    'ค่าล่วงเวลา',
    'ค่าเบี้ยเลี้ยง',
  ],
  notes: [
    '1. พนักงานจะต้องเคลียร์ค่าใช้จ่ายทุกวันอังคารและพฤหัสบดี',
    '2. พนักงานที่ซื้อของด้วยตนเองมีหน้าที่ต้องตรวจชื่อและที่อยู่ที่ลงในใบกำกับภาษีว่าถูกต้องหรือไม่ ถ้าผิดพนักงานต้องรับผิดชอบเปลี่ยนบิลเอง',
    '3. ใบกำกับภาษีของค่าน้ำมันจะต้องระบุเลขทะเบียนรถคันที่พนักงานเอาไปใช้ด้วยทุกครั้ง',
    '4. ใบเบิกค่าใช้จ่ายต่อ 1 ชุด ค่าใช้จ่ายทุกรายการจะต้องเป็นบริษัทเดียวกันและเดือนเดียวกัน',
  ],
  columns: EXPENSE_CLAIM_DEFAULT_COLUMNS,
}

export interface UserProfile {
  uid: string
  employeeId: string
  firstName: string
  lastName: string
  position: string
  department: string
  companyId: string
  defaultJob: string
  bankAccount: string
  role: Role
  mustChangePassword: boolean
  createdAt: number
}

export interface ExpenseTotals {
  columnTotals: Record<string, number>
  grandTotal: number
  amountInThaiText: string
}

export interface ExpenseHeader {
  subject: string
  categories: string[]
  companyId: string
  firstName: string
  lastName: string
  position: string
  job: string
}

export interface Submission {
  id: string
  formType: string
  docNumber: string
  header: ExpenseHeader
  items: ExpenseRow[]
  totals: ExpenseTotals
  createdBy: string
  createdByEmployeeId: string
  createdAt: number
  updatedAt: number
  printCount: number
  lastPrintedAt: number | null
}

// Build a blank row for the given columns: text -> '', number/calc -> 0
export function emptyRow(columns: FormColumn[]): ExpenseRow {
  const row: ExpenseRow = {}
  for (const c of columns) row[c.key] = c.type === 'text' ? '' : 0
  return row
}
