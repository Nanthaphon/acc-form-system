export type Role = 'employee' | 'admin'

export interface Company { id: string; name: string; address: string }

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
