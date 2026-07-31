export type Role = 'employee' | 'admin'

export interface Company { id: string; name: string; address: string; logo?: string | null }

export interface FormSettings {
  formType: string; title: string; subject: string; attention: string; formCode: string
  categories: string[]; notes: string[]
}

export const EXPENSE_CLAIM_DEFAULTS: FormSettings = {
  formType: 'expense-claim',
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

export interface ItemOverrides { amountBeforeWht?: boolean; wht3?: boolean; amountNet?: boolean }

export interface ExpenseItem {
  date: string          // 'dd/mm/yyyy'
  pcCode: string
  pcName: string
  workDays: number
  ratePerDay: number
  bankAccount: string
  pcType: string
  job: string
  applyWht: boolean
  amountBeforeWht: number
  wht3: number
  amountNet: number
  overrides: ItemOverrides
}

export interface ExpenseTotals {
  totalBefore: number
  totalWht: number
  totalNet: number
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
  formType: 'expense-claim'
  docNumber: string
  header: ExpenseHeader
  items: ExpenseItem[]
  totals: ExpenseTotals
  createdBy: string
  createdByEmployeeId: string
  createdAt: number
  updatedAt: number
  printCount: number
  lastPrintedAt: number | null
}

export function emptyItem(): ExpenseItem {
  return {
    date: '', pcCode: '', pcName: '', workDays: 0, ratePerDay: 0,
    bankAccount: '', pcType: '', job: '', applyWht: true,
    amountBeforeWht: 0, wht3: 0, amountNet: 0, overrides: {},
  }
}
