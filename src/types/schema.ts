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
// Extra header field on a form (beyond the fixed ชื่อ/นามสกุล/ตำแหน่ง/Job),
// e.g. วันที่ต้องการใช้เงิน, วัตถุประสงค์. Values live in ExpenseHeader.fields.
export interface HeaderField {
  id: string
  label: string
  type: 'text' | 'date'
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
  accessGroup?: string | null          // legacy single access group — superseded by accessGroups (read via formAccessGroups)
  accessGroups?: string[]              // access groups that may see this form; empty = everyone
  active?: boolean
  createdAt?: number                   // ms — for sorting the form list
  updatedAt?: number                   // ms — bumped on every save / rename
  signatureBlocks?: SignatureBlock[]   // configurable signature blocks (read via formSignatureBlocks)
  headerFields?: HeaderField[]         // extra header fields shown above the table
  introText?: string                   // free paragraph shown above the table (below the header)
  bodyText?: string                    // free declaration/certification paragraph shown below the table, above signatures
  showRequester?: boolean              // show the ชื่อ/นามสกุล/ตำแหน่ง/Job line (default true)
  showAmountWords?: boolean            // show the "เป็นจำนวนเงิน ... บาทถ้วน" box (default true)
  seqWidth?: number                    // width of the leading ลำดับ column (see SEQ_COLUMN_WIDTH)
  requesterTitle?: string              // heading above the requester fields on the fill-in screen (read via sectionTitles)
  itemsTitle?: string                  // heading above the items table on the fill-in screen (read via sectionTitles)
}

// Headings of the two editable sections on the FILL-IN screen (they are not
// printed on the document). A form that never set them — or that cleared them
// to blank — falls back to the built-in wording. Single source of truth: do not
// re-inline these defaults.
export const DEFAULT_REQUESTER_TITLE = 'ข้อมูลผู้เบิก'
export const DEFAULT_ITEMS_TITLE = 'รายการเบิก'
export function sectionTitles(f?: Pick<FormSettings, 'requesterTitle' | 'itemsTitle'> | null): { requester: string; items: string } {
  return {
    requester: f?.requesterTitle?.trim() || DEFAULT_REQUESTER_TITLE,
    items: f?.itemsTitle?.trim() || DEFAULT_ITEMS_TITLE,
  }
}

// Access groups allowed to see a form. Forms saved before multi-group support
// only carry the legacy single `accessGroup`; treat it as a one-item list.
export function formAccessGroups(f: Pick<FormSettings, 'accessGroup' | 'accessGroups'>): string[] {
  if (f.accessGroups?.length) return f.accessGroups
  return f.accessGroup ? [f.accessGroup] : []
}
// Admins see every form; everyone else sees forms open to all (no groups
// selected) or forms that list their own access group.
export function canSeeForm(f: Pick<FormSettings, 'accessGroup' | 'accessGroups'>, viewerGroup: string | undefined, isAdmin: boolean): boolean {
  if (isAdmin) return true
  const allowed = formAccessGroups(f)
  return allowed.length === 0 || (!!viewerGroup && allowed.includes(viewerGroup))
}

// The leading ลำดับ column is built in rather than configured as a column, so
// its width is a form setting of its own. The default is narrow enough for the
// row numbers but too narrow for the word "ลำดับ" itself, which is why it can
// be set per form.
export const SEQ_COLUMN_WIDTH = 30
export function seqColumnWidth(f?: Pick<FormSettings, 'seqWidth'> | null): number {
  const w = f?.seqWidth
  return typeof w === 'number' && w > 0 ? w : SEQ_COLUMN_WIDTH
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
  createdAt: number
  signatureImage?: string          // saved signature (data URL), reused when signing documents
  isSuperAdmin?: boolean           // the one admin who may set anyone's password (see shared/roles)
  passwordIsDefault?: boolean      // password is still the default one (= employeeId)
}

export interface ExpenseTotals {
  columnTotals: Record<string, number>
  grandTotal: number          // items subtotal (before VAT / withholding)
  amountInThaiText: string     // baht text of the net total
  vatAmount?: number           // 7% of subtotal when VAT is ticked
  whtAmount?: number           // withholding tax deducted (3% or 5% of subtotal)
  retentionAmount?: number     // ค่าประกันงาน held back, a % of subtotal
  netTotal?: number            // subtotal + VAT − withholding − retention
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
  retentionRate?: number       // ค่าประกันงาน held back (%), deducted like withholding
  fields?: Record<string, string>   // values for the form's custom header fields (by field id)
}

// Derived from a document's signature assignments PLUS its form's config —
// Sending for online signatures is optional, so a saved document with no
// assignments is already finished ('done'); once sent it is 'pending' until
// every assigned block is signed.
export type SubmissionStatus = 'done' | 'pending' | 'signed'

// A signature block configured on a form (up to 6). Whether a block is signed
// online is decided per document when it is sent — any block left without a
// signer prints as a blank line for a wet signature.
export interface SignatureBlock {
  id: string
  label: string
  online?: boolean   // legacy per-block flag — ignored; kept so old saved configs still type-check
}
// The first signature block is always the requester (ผู้เบิก) — signed by the
// person filling the form (auto, no signer dropdown).
export const MAX_SIGNATURE_BLOCKS = 6
export const DEFAULT_SIGNATURE_BLOCKS: SignatureBlock[] = [
  { id: 'requester', label: 'ผู้เบิก' },
  { id: 'head', label: 'หัวหน้าแผนก' },
  { id: 'approver', label: 'ผู้อนุมัติ' },
  { id: 'receiver', label: 'ผู้รับเงิน' },
  { id: 'checker', label: 'ผู้ตรวจสอบ/ฝ่ายบัญชี' },
]

// The signature blocks a form actually uses. A form that has never been
// configured stores an empty array (the DB column default), so fall back to the
// built-in set. Single source of truth — do not re-inline this fallback.
export function formSignatureBlocks(f?: Pick<FormSettings, 'signatureBlocks'> | null): SignatureBlock[] {
  return f?.signatureBlocks?.length ? f.signatureBlocks : DEFAULT_SIGNATURE_BLOCKS
}
// Can a document on this form be sent to someone for signing? Only when there
// is at least one block besides the requester's own (the first block).
export function canRequestSignatures(f?: Pick<FormSettings, 'signatureBlocks'> | null): boolean {
  return formSignatureBlocks(f).length > 1
}

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
  attachments?: Attachment[]         // files attached to this document (stored in the 'attachments' bucket)
}

// A document as the lists load it: no item rows or attachments, and its
// signatures may come without their images (see listRows in data/submissions).
export type SubmissionSummary = Omit<Submission, 'items' | 'attachments'>

// A file attached to a document. `path` is the storage object key
// (`<submissionId>/<uuid>.<ext>`); `name` keeps the original file name for display.
export interface Attachment {
  path: string
  name: string
  size: number        // bytes
  type: string        // MIME type
  uploadedAt: number  // ms
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
