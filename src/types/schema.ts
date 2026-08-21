export type Role = 'employee' | 'admin'

export interface Company { id: string; name: string; address: string; logo?: string | null; headerName?: string | null }

// ===== Dynamic column model =====
export type ColumnType = 'text' | 'number' | 'calc' | 'date' | 'select'

// Textual columns (string values, left-aligned, never summed).
export function isTextCol(type: ColumnType): boolean {
  return type === 'text' || type === 'date' || type === 'select'
}
export interface CalcDef {
  op: 'multiply' | 'subtract' | 'add' | 'percent' | 'divide'
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
  width?: number       // optional fixed column width in pixels; undefined = auto/flex width
  options?: string[]   // choices for type==='select' (dropdown)
}

// One row of the dynamic table, keyed by column.key
export type ExpenseRow = Record<string, string | number>

export interface FormGroup { id: string; name: string; sortOrder: number; createdAt: number; active?: boolean }

// Access groups control form VISIBILITY (separate from folders/form_groups).
// A form tagged with an access group is visible only to employees in the same
// access group; an untagged form is visible to everyone. Groups are stored in
// the `access_groups` table and managed by admins; ACCESS_GROUPS below is only
// the seed/fallback used before the migration runs or if the table is empty.
export interface AccessGroup {
  id: string
  name: string
  sortOrder: number
  createdAt: number
}
export const ACCESS_GROUPS = [
  { id: 'dx', name: 'Design Experience' },
  { id: 'pcms', name: 'PcMs' },
]

// Departments are the org unit used to route approvals: an employee belongs to
// one department; an approver covers one or more departments. Managed by admins
// in the `departments` table (part of the online-approval feature).
export interface Department {
  id: string
  name: string
  sortOrder: number
  createdAt: number
}

// A form/folder is visible to employees only when active. Admins always see it
// (with a toggle) so they can close a form for maintenance and reopen it.
export function isActive(x: { active?: boolean }): boolean {
  return x.active !== false
}

export interface FormSettings {
  formType: string; title: string; subject: string; attention: string; formCode: string
  categories: string[]; notes: string[]
  columns: FormColumn[]
  groupId?: string; name?: string
  accessGroup?: string
  active?: boolean
  signatureBlocks?: SignatureBlock[]   // configurable signature blocks (falls back to DEFAULT_SIGNATURE_BLOCKS)
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
  groupId?: string
  accessGroup?: string
  departmentId?: string
  createdAt: number
  signatureImage?: string          // saved signature (data URL), reused when signing documents
}

export interface ExpenseTotals {
  columnTotals: Record<string, number>
  grandTotal: number          // items subtotal (before VAT / withholding)
  amountInThaiText: string     // baht text of the net total
  vatAmount?: number           // 7% of subtotal when VAT is ticked
  whtAmount?: number           // withholding tax deducted (3% or 5% of subtotal)
  netTotal?: number            // subtotal + VAT − withholding
}

export interface ExpenseHeader {
  subject: string
  categories: string[]
  companyId: string
  firstName: string
  lastName: string
  position: string
  job: string
  vat?: boolean                // add 7% VAT
  whtRate?: number             // withholding tax rate: 0 | 3 | 5
}

export type SubmissionStatus = 'draft' | 'pending' | 'signed'

// A signature block configured on a form (up to 6, first is normally ผู้เบิก).
// `online` = this block needs an online signature (a signer is assigned when
// filling); otherwise it prints as a blank line for a wet signature.
export interface SignatureBlock {
  id: string
  label: string
  online: boolean
}
export const MAX_SIGNATURE_BLOCKS = 6
export const DEFAULT_SIGNATURE_BLOCKS: SignatureBlock[] = [
  { id: 'requester', label: 'ผู้เบิก', online: false },
  { id: 'head', label: 'หัวหน้าแผนก', online: false },
  { id: 'approver', label: 'ผู้อนุมัติ', online: false },
  { id: 'receiver', label: 'ผู้รับเงิน', online: false },
  { id: 'checker', label: 'ผู้ตรวจสอบ/ฝ่ายบัญชี', online: false },
]

// One online signature slot on a document: the block it fills, who was assigned,
// and (once they sign) a snapshot of their signature image.
export interface DocSignature {
  blockId: string
  blockLabel: string
  assignedUid: string
  assignedName: string
  status: 'pending' | 'signed'
  signatureImage?: string
  signedAt?: number
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
  signatures?: DocSignature[]        // online signature assignments for this document
}

// One saved snapshot of a document. version 1 = created; +1 on each real edit.
export interface SubmissionVersion {
  id: string
  submissionId: string
  version: number
  header: ExpenseHeader
  items: ExpenseRow[]
  totals: ExpenseTotals
  editedBy: string
  editedByName: string
  editedAt: number
}

// Build a blank row for the given columns: text -> '', number/calc -> 0
export function emptyRow(columns: FormColumn[]): ExpenseRow {
  const row: ExpenseRow = {}
  for (const c of columns) row[c.key] = isTextCol(c.type) ? '' : 0
  return row
}
