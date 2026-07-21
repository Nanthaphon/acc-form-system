# Expense Form Web App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เว็บให้พนักงานล็อกอินด้วยรหัสพนักงาน กรอกฟอร์ม "ใบเบิกค่าใช้จ่าย" ออกเป็น PDF/สั่งพิมพ์ เก็บประวัติแก้ไขย้อนหลังได้ พร้อมฝั่ง admin จัดการพนักงานและดูประวัติการพิมพ์

**Architecture:** React SPA (Vite + TS + Tailwind) ต่อ Firebase โดยตรง (Auth email/password + Firestore) แบบ **ไม่มี backend** — ตรรกะคำนวณ/แปลงตัวอักษรไทย/CSV เป็น pure functions ที่ทดสอบด้วย Vitest, สร้าง PDF ด้วย @react-pdf/renderer ฝั่ง browser

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, react-router-dom v6, firebase v10 (+ Emulator Suite), @react-pdf/renderer, papaparse, Vitest, @testing-library/react

**อ้างอิงสเปก:** `docs/superpowers/specs/2026-07-21-expense-form-webapp-design.md`

---

## File Structure (สร้าง/แก้อะไรบ้าง)

```
.env.local                         # Firebase config (ไม่ commit)
firebase.json                      # Hosting + emulator config
firestore.rules                    # Security rules
src/
  main.tsx                         # entry + router
  lib/firebase.ts                  # init Firebase (app, auth, db) + secondary app
  types/schema.ts                  # ทุก type ที่ใช้ร่วมกัน
  shared/
    bahttext.ts                    # จำนวนเงิน → ตัวอักษรไทย (pure)
    docNumber.ts                   # format เลขเอกสาร (pure)
    csv.ts                         # parse/validate CSV พนักงาน (pure)
  features/expense-claim/
    calc.ts                        # กฎคำนวณ (pure)
    ExpenseClaimForm.tsx           # หน้ากรอก
    ExpenseClaimPreview.tsx        # preview HTML + print layout
    ExpenseClaimPdf.tsx            # เอกสาร PDF
  data/
    auth.ts                        # login/logout/changePassword/mapId→email
    users.ts                       # CRUD โปรไฟล์ + สร้างบัญชี + import CSV
    companies.ts                   # อ่าน/seed บริษัท
    submissions.ts                 # create/update/list + transaction เลขเอกสาร
  auth/
    AuthProvider.tsx               # context ผู้ใช้ปัจจุบัน + role
    RequireAuth.tsx, RequireAdmin.tsx
  pages/
    LoginPage.tsx, ChangePasswordPage.tsx, ProfilePage.tsx
    employee/DashboardPage.tsx, FormPage.tsx, HistoryPage.tsx
    admin/EmployeeListPage.tsx, AddEmployeePage.tsx, ImportCsvPage.tsx, PrintHistoryPage.tsx
  components/Layout.tsx, Nav.tsx
public/fonts/Sarabun-*.ttf          # ฟอนต์ไทยสำหรับ PDF
scripts/seed.ts                     # seed companies + admin คนแรก (รันครั้งเดียว)
```

**หลักการ:** pure logic (`shared/*`, `calc.ts`) ทดสอบเต็มด้วย TDD; data layer (`data/*`) ทดสอบกับ Firebase Emulator; UI ทดสอบเฉพาะจุดสำคัญด้วย Testing Library

---

## Phase 0 — Project setup

### Task 1: Scaffold โปรเจค + Tailwind + Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `src/index.css`, `src/main.tsx`, `src/App.tsx`, `vitest.config.ts`, `src/smoke.test.ts`

- [ ] **Step 1: สร้างโปรเจค Vite (React + TS)**

Run ในโฟลเดอร์ `Acc Form Project`:
```bash
npm create vite@latest . -- --template react-ts
npm install
```
ถ้าถามว่าโฟลเดอร์ไม่ว่าง ให้เลือก "Ignore files and continue"

- [ ] **Step 2: ติดตั้ง dependencies**

```bash
npm install react-router-dom firebase @react-pdf/renderer papaparse
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom @types/papaparse
npx tailwindcss init -p
```

- [ ] **Step 3: ตั้งค่า Tailwind**

`tailwind.config.js`:
```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```
`src/index.css` (บรรทัดบนสุด):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: ตั้งค่า Vitest**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'] },
})
```
`src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```
เพิ่มใน `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

- [ ] **Step 5: Smoke test**

`src/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
describe('smoke', () => { it('runs', () => { expect(1 + 1).toBe(2) }) })
```

- [ ] **Step 6: รันเทสต์ให้ผ่าน**

Run: `npm test`
Expected: 1 passed

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold vite react ts + tailwind + vitest"
```
(หมายเหตุ: โฟลเดอร์นี้ยังไม่ init git — Step นี้ init ให้)

---

### Task 2: Firebase init + Emulator config

**Files:**
- Create: `.env.local`, `.gitignore` (เพิ่ม), `src/lib/firebase.ts`, `firebase.json`, `.firebaserc`

- [ ] **Step 1: เพิ่ม .env.local (ค่าจริงกรอกภายหลัง)**

`.env.local`:
```
VITE_FB_API_KEY=xxx
VITE_FB_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FB_PROJECT_ID=xxx
VITE_FB_APP_ID=xxx
VITE_USE_EMULATOR=true
```
เพิ่มใน `.gitignore`: `.env.local`

- [ ] **Step 2: เขียน firebase.ts**

`src/lib/firebase.ts`:
```ts
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}
export const app = initializeApp(config)
export const auth = getAuth(app)
export const db = getFirestore(app)

// secondary app: ใช้สร้างบัญชีพนักงานโดยไม่ทำให้ session admin หลุด (Task 10)
export const secondaryApp = initializeApp(config, 'secondary')
export const secondaryAuth = getAuth(secondaryApp)

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectAuthEmulator(secondaryAuth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8080)
}
```

- [ ] **Step 3: firebase.json + emulator**

`firebase.json`:
```json
{
  "firestore": { "rules": "firestore.rules" },
  "hosting": { "public": "dist", "rewrites": [{ "source": "**", "destination": "/index.html" }] },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true }
  }
}
```
`.firebaserc`:
```json
{ "projects": { "default": "REPLACE_WITH_PROJECT_ID" } }
```

- [ ] **Step 4: ยืนยัน build ไม่พัง**

Run: `npm run build`
Expected: build สำเร็จ (ยังไม่ใช้ firebase ที่ไหน แค่ต้อง import ได้)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: firebase init + emulator config"
```

---

## Phase 1 — Pure logic (TDD)

### Task 3: Shared types (schema.ts)

**Files:**
- Create: `src/types/schema.ts`

- [ ] **Step 1: เขียน types**

`src/types/schema.ts`:
```ts
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
```

- [ ] **Step 2: ยืนยัน typecheck ผ่าน**

Run: `npx tsc --noEmit`
Expected: ไม่มี error

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: shared schema types"
```

---

### Task 4: Thai baht text (bahttext.ts)

**Files:**
- Create: `src/shared/bahttext.ts`, `src/shared/bahttext.test.ts`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

`src/shared/bahttext.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { bahtText } from './bahttext'

describe('bahtText', () => {
  it('ศูนย์', () => expect(bahtText(0)).toBe('ศูนย์บาทถ้วน'))
  it('หลักหน่วย', () => expect(bahtText(1)).toBe('หนึ่งบาทถ้วน'))
  it('เอ็ด', () => expect(bahtText(11)).toBe('สิบเอ็ดบาทถ้วน'))
  it('ยี่สิบ', () => expect(bahtText(21)).toBe('ยี่สิบเอ็ดบาทถ้วน'))
  it('ร้อย', () => expect(bahtText(101)).toBe('หนึ่งร้อยเอ็ดบาทถ้วน'))
  it('พัน', () => expect(bahtText(13095)).toBe('หนึ่งหมื่นสามพันเก้าสิบห้าบาทถ้วน'))
  it('ล้าน', () => expect(bahtText(1000000)).toBe('หนึ่งล้านบาทถ้วน'))
  it('สตางค์', () => expect(bahtText(25.50)).toBe('ยี่สิบห้าบาทห้าสิบสตางค์'))
  it('ปัดสตางค์', () => expect(bahtText(0.25)).toBe('ยี่สิบห้าสตางค์'))
})
```

- [ ] **Step 2: รันให้ FAIL**

Run: `npm test -- bahttext`
Expected: FAIL (bahtText not defined)

- [ ] **Step 3: เขียน implementation**

`src/shared/bahttext.ts`:
```ts
const DIGITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

function readGroup(numStr: string): string {
  // numStr ยาว 1-6 หลัก (กลุ่มก่อน "ล้าน")
  let result = ''
  const len = numStr.length
  for (let i = 0; i < len; i++) {
    const d = Number(numStr[i])
    const place = len - i - 1
    if (d === 0) continue
    if (place === 1 && d === 1) result += 'สิบ'
    else if (place === 1 && d === 2) result += 'ยี่สิบ'
    else if (place === 0 && d === 1 && len > 1) result += 'เอ็ด'
    else result += DIGITS[d] + PLACES[place]
  }
  return result
}

function readInteger(n: number): string {
  if (n === 0) return 'ศูนย์'
  let s = String(n)
  let result = ''
  // แยกทีละ 6 หลักด้วยคำว่า "ล้าน"
  while (s.length > 6) {
    const tail = s.slice(-6)
    s = s.slice(0, -6)
    result = readGroup(tail) + 'ล้าน' + result
  }
  result = readGroup(s) + result
  return result
}

export function bahtText(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const baht = Math.floor(rounded)
  const satang = Math.round((rounded - baht) * 100)
  if (satang === 0) return readInteger(baht) + 'บาทถ้วน'
  const bahtPart = baht === 0 ? '' : readInteger(baht) + 'บาท'
  return bahtPart + readInteger(satang) + 'สตางค์'
}
```

- [ ] **Step 4: รันให้ PASS**

Run: `npm test -- bahttext`
Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: thai baht text converter"
```

---

### Task 5: Expense calc (calc.ts)

**Files:**
- Create: `src/features/expense-claim/calc.ts`, `src/features/expense-claim/calc.test.ts`

- [ ] **Step 1: เขียนเทสต์**

`src/features/expense-claim/calc.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeItem, computeTotals, round2 } from './calc'
import { emptyItem } from '../../types/schema'

describe('computeItem', () => {
  it('คำนวณ ก่อนหัก = วันทำงาน × วันละ', () => {
    const r = computeItem({ ...emptyItem(), workDays: 27, ratePerDay: 500 })
    expect(r.amountBeforeWht).toBe(13500)
  })
  it('หัก 3% และยอดสุทธิ', () => {
    const r = computeItem({ ...emptyItem(), workDays: 27, ratePerDay: 500, applyWht: true })
    expect(r.wht3).toBe(405)
    expect(r.amountNet).toBe(13095)
  })
  it('ไม่หักเมื่อ applyWht=false', () => {
    const r = computeItem({ ...emptyItem(), workDays: 10, ratePerDay: 500, applyWht: false })
    expect(r.wht3).toBe(0)
    expect(r.amountNet).toBe(5000)
  })
  it('override ก่อนหัก แล้วสูตรอื่นคิดต่อจากค่า override', () => {
    const r = computeItem({ ...emptyItem(), workDays: 1, ratePerDay: 1, applyWht: true,
      amountBeforeWht: 1000, overrides: { amountBeforeWht: true } })
    expect(r.amountBeforeWht).toBe(1000)
    expect(r.wht3).toBe(30)
    expect(r.amountNet).toBe(970)
  })
  it('override wht3 โดยตรง', () => {
    const r = computeItem({ ...emptyItem(), workDays: 27, ratePerDay: 500, applyWht: true,
      wht3: 400, overrides: { wht3: true } })
    expect(r.wht3).toBe(400)
    expect(r.amountNet).toBe(13100)
  })
})

describe('computeTotals', () => {
  it('รวมทุกคอลัมน์ + ตัวอักษรไทย', () => {
    const items = [
      { ...emptyItem(), workDays: 27, ratePerDay: 500 },
      { ...emptyItem(), workDays: 25, ratePerDay: 500 },
    ]
    const t = computeTotals(items)
    expect(t.totalBefore).toBe(26000)
    expect(t.totalWht).toBe(780)
    expect(t.totalNet).toBe(25220)
    expect(t.amountInThaiText).toBe('สองหมื่นห้าพันสองร้อยยี่สิบบาทถ้วน')
  })
})

describe('round2', () => {
  it('ปัด 2 ตำแหน่ง', () => expect(round2(405.005)).toBe(405.01))
})
```

- [ ] **Step 2: รันให้ FAIL**

Run: `npm test -- calc`
Expected: FAIL

- [ ] **Step 3: เขียน implementation**

`src/features/expense-claim/calc.ts`:
```ts
import { ExpenseItem, ExpenseTotals } from '../../types/schema'
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
```

- [ ] **Step 4: รันให้ PASS**

Run: `npm test -- calc`
Expected: all passed

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: expense claim calculation logic"
```

---

### Task 6: Doc number formatter (docNumber.ts)

**Files:**
- Create: `src/shared/docNumber.ts`, `src/shared/docNumber.test.ts`

- [ ] **Step 1: เขียนเทสต์**

`src/shared/docNumber.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatDocNumber } from './docNumber'

describe('formatDocNumber', () => {
  it('ประกอบ prefix + ปีเดือน(พ.ศ. 2 หลัก) + running 4 หลัก', () => {
    // 2026-07 → พ.ศ. 2569 → '6907'
    expect(formatDocNumber('GAC6709-003', new Date('2026-07-21'), 1)).toBe('GAC6709-003-6907-0001')
  })
  it('running เกิน 9999 ไม่ตัด', () => {
    expect(formatDocNumber('X', new Date('2026-01-01'), 12345)).toBe('X-6901-12345')
  })
})
```

- [ ] **Step 2: รันให้ FAIL**

Run: `npm test -- docNumber`
Expected: FAIL

- [ ] **Step 3: เขียน implementation**

`src/shared/docNumber.ts`:
```ts
export function formatDocNumber(prefix: string, date: Date, seq: number): string {
  const buddhistYear = date.getFullYear() + 543
  const yy = String(buddhistYear).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const seqStr = String(seq).padStart(4, '0')
  return `${prefix}-${yy}${mm}-${seqStr}`
}
```

- [ ] **Step 4: รันให้ PASS**

Run: `npm test -- docNumber`
Expected: passed

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: document number formatter"
```

---

### Task 7: CSV parser for employee import (csv.ts)

**Files:**
- Create: `src/shared/csv.ts`, `src/shared/csv.test.ts`

- [ ] **Step 1: เขียนเทสต์**

`src/shared/csv.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseEmployeeCsv } from './csv'

const CSV = `employeeId,firstName,lastName,position,department,companyId,defaultJob,bankAccount,role
244530,หทัยรัตน์,ไวยขุนทด,PC Specialist,PC,globe,Haier,SCB-123,employee
244531,สมชาย,ใจดี,Manager,HR,besthrm,,KTB-456,admin`

describe('parseEmployeeCsv', () => {
  it('แปลงแถวเป็นโปรไฟล์', () => {
    const { rows, errors } = parseEmployeeCsv(CSV)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(2)
    expect(rows[0].employeeId).toBe('244530')
    expect(rows[0].role).toBe('employee')
    expect(rows[1].role).toBe('admin')
  })
  it('รายงาน error เมื่อขาด employeeId', () => {
    const bad = `employeeId,firstName,lastName,position,department,companyId,defaultJob,bankAccount,role
,x,y,z,d,globe,,,employee`
    const { errors } = parseEmployeeCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('employeeId')
  })
  it('role ผิดค่า → error', () => {
    const bad = `employeeId,firstName,lastName,position,department,companyId,defaultJob,bankAccount,role
1,x,y,z,d,globe,,,superuser`
    const { errors } = parseEmployeeCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: รันให้ FAIL**

Run: `npm test -- csv`
Expected: FAIL

- [ ] **Step 3: เขียน implementation**

`src/shared/csv.ts`:
```ts
import Papa from 'papaparse'
import { Role } from '../types/schema'

export interface CsvEmployeeRow {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role
}

const REQUIRED = ['employeeId', 'firstName', 'lastName', 'companyId'] as const

export function parseEmployeeCsv(text: string): { rows: CsvEmployeeRow[]; errors: string[] } {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true })
  const rows: CsvEmployeeRow[] = []
  const errors: string[] = []
  parsed.data.forEach((raw, idx) => {
    const line = idx + 2 // +1 header +1 1-based
    for (const f of REQUIRED) {
      if (!raw[f] || !raw[f].trim()) errors.push(`บรรทัด ${line}: ขาดค่า ${f}`)
    }
    const role = (raw.role || 'employee').trim()
    if (role !== 'employee' && role !== 'admin') {
      errors.push(`บรรทัด ${line}: role ต้องเป็น employee หรือ admin`)
    }
    rows.push({
      employeeId: (raw.employeeId || '').trim(),
      firstName: (raw.firstName || '').trim(),
      lastName: (raw.lastName || '').trim(),
      position: (raw.position || '').trim(),
      department: (raw.department || '').trim(),
      companyId: (raw.companyId || '').trim(),
      defaultJob: (raw.defaultJob || '').trim(),
      bankAccount: (raw.bankAccount || '').trim(),
      role: (role === 'admin' ? 'admin' : 'employee') as Role,
    })
  })
  return { rows, errors }
}
```

- [ ] **Step 4: รันให้ PASS**

Run: `npm test -- csv`
Expected: passed

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: employee CSV parser + validation"
```

---

## Phase 2 — Data layer (Firebase Emulator)

> **Setup ก่อนเริ่ม Phase นี้:**
> 1. ติดตั้ง Firebase CLI: `npm install -D firebase-tools`
> 2. รัน emulator ในอีก terminal: `npx firebase emulators:start`
> 3. **สำคัญ — ให้ vitest ต่อ emulator:** เพิ่ม `env: { VITE_USE_EMULATOR: 'true', VITE_FB_API_KEY: 'demo', VITE_FB_PROJECT_ID: 'demo-test', VITE_FB_AUTH_DOMAIN: 'demo', VITE_FB_APP_ID: 'demo' }` เข้าไปในบล็อก `test:` ของ `vitest.config.ts` เพื่อให้ `firebase.ts` เรียก `connect*Emulator` ตอนรันเทสต์ (มิฉะนั้นเทสต์จะพยายามต่อ Firebase จริงแล้วล้มเหลว)
> 4. เพิ่ม script `"test:emu": "vitest run src/data"`

### Task 8: Auth data layer (auth.ts)

**Files:**
- Create: `src/data/auth.ts`, `src/data/auth.test.ts`

- [ ] **Step 1: เขียนเทสต์ (ต้องมี emulator รันอยู่)**

`src/data/auth.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { employeeIdToEmail, loginWithEmployeeId } from './auth'
import { secondaryAuth } from '../lib/firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'

describe('employeeIdToEmail', () => {
  it('map รหัสพนักงานเป็นอีเมลสังเคราะห์', () => {
    expect(employeeIdToEmail('244530')).toBe('244530@globe.local')
  })
})

describe('loginWithEmployeeId', () => {
  beforeAll(async () => {
    // สร้างบัญชีทดสอบผ่าน secondary เพื่อไม่รบกวน primary session
    await createUserWithEmailAndPassword(secondaryAuth, employeeIdToEmail('999001'), '999001')
    await secondaryAuth.signOut()
  })
  it('ล็อกอินด้วยรหัสพนักงาน + รหัสผ่านถูก', async () => {
    const cred = await loginWithEmployeeId('999001', '999001')
    expect(cred.user.email).toBe('999001@globe.local')
  })
})
```

- [ ] **Step 2: รันให้ FAIL**

Run: `npm test -- src/data/auth`
Expected: FAIL

- [ ] **Step 3: เขียน implementation**

`src/data/auth.ts`:
```ts
import { auth } from '../lib/firebase'
import {
  signInWithEmailAndPassword, signOut as fbSignOut,
  updatePassword, User,
} from 'firebase/auth'

const DOMAIN = 'globe.local'
export function employeeIdToEmail(employeeId: string): string {
  return `${employeeId.trim()}@${DOMAIN}`
}

export function loginWithEmployeeId(employeeId: string, password: string) {
  return signInWithEmailAndPassword(auth, employeeIdToEmail(employeeId), password)
}

export function logout() { return fbSignOut(auth) }

export function changeMyPassword(user: User, newPassword: string) {
  return updatePassword(user, newPassword)
}
```

- [ ] **Step 4: รันให้ PASS**

Run: `npm test -- src/data/auth`
Expected: passed

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: auth data layer (employee id login)"
```

---

### Task 9: Companies + Users data layer

**Files:**
- Create: `src/data/companies.ts`, `src/data/users.ts`, `src/data/users.test.ts`

- [ ] **Step 1: เขียนเทสต์**

`src/data/users.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createEmployee, getProfileByUid } from './users'

describe('createEmployee', () => {
  it('สร้างบัญชี + โปรไฟล์ แล้วอ่านกลับได้', async () => {
    const uid = await createEmployee({
      employeeId: '888001', firstName: 'ทดสอบ', lastName: 'ระบบ',
      position: 'PC', department: 'PC', companyId: 'globe',
      defaultJob: 'Haier', bankAccount: 'SCB-1', role: 'employee',
    })
    const profile = await getProfileByUid(uid)
    expect(profile?.employeeId).toBe('888001')
    expect(profile?.mustChangePassword).toBe(true)
  })
})
```

- [ ] **Step 2: รันให้ FAIL**

Run: `npm test -- src/data/users`
Expected: FAIL

- [ ] **Step 3: เขียน companies.ts**

`src/data/companies.ts`:
```ts
import { db } from '../lib/firebase'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { Company } from '../types/schema'

export async function getCompany(id: string): Promise<Company | null> {
  const snap = await getDoc(doc(db, 'companies', id))
  return snap.exists() ? ({ id, ...snap.data() } as Company) : null
}
export async function listCompanies(): Promise<Company[]> {
  const snap = await getDocs(collection(db, 'companies'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Company))
}
export async function upsertCompany(c: Company): Promise<void> {
  await setDoc(doc(db, 'companies', c.id), { name: c.name, address: c.address })
}
```

- [ ] **Step 4: เขียน users.ts**

`src/data/users.ts`:
```ts
import { db, secondaryAuth } from '../lib/firebase'
import { doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { UserProfile, Role } from '../types/schema'
import { employeeIdToEmail } from './auth'

export interface NewEmployee {
  employeeId: string; firstName: string; lastName: string
  position: string; department: string; companyId: string
  defaultJob: string; bankAccount: string; role: Role
}

// สร้างบัญชี Auth ผ่าน secondary app (ไม่ทำ admin session หลุด) + เขียนโปรไฟล์
export async function createEmployee(e: NewEmployee): Promise<string> {
  const cred = await createUserWithEmailAndPassword(
    secondaryAuth, employeeIdToEmail(e.employeeId), e.employeeId, // รหัสเริ่มต้น = รหัสพนักงาน
  )
  const uid = cred.user.uid
  const profile: UserProfile = {
    uid, ...e, mustChangePassword: true, createdAt: Date.now(),
  }
  await setDoc(doc(db, 'users', uid), profile)
  await secondaryAuth.signOut()
  return uid
}

export async function getProfileByUid(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function listEmployees(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => d.data() as UserProfile)
}

export async function setMustChangePassword(uid: string, value: boolean): Promise<void> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (snap.exists()) await setDoc(doc(db, 'users', uid), { ...snap.data(), mustChangePassword: value })
}
```

- [ ] **Step 5: รันให้ PASS**

Run: `npm test -- src/data/users`
Expected: passed

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: companies + users data layer"
```

---

### Task 10: Submissions data layer + doc-number transaction

**Files:**
- Create: `src/data/submissions.ts`, `src/data/submissions.test.ts`

- [ ] **Step 1: เขียนเทสต์**

`src/data/submissions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createSubmission, updateSubmission, listMySubmissions, incrementPrint } from './submissions'
import { emptyItem } from '../types/schema'
import { computeTotals } from '../features/expense-claim/calc'

function draft(uid: string) {
  const items = [{ ...emptyItem(), workDays: 27, ratePerDay: 500 }]
  return {
    formType: 'expense-claim' as const,
    header: { subject: 'ขออนุมัติเบิกค่าใช้จ่าย', categories: [], companyId: 'globe',
      firstName: 'a', lastName: 'b', position: 'PC', job: 'Haier' },
    items,
    totals: computeTotals(items),
    createdBy: uid, createdByEmployeeId: '888001',
  }
}

describe('submissions', () => {
  it('สร้างแล้วได้เลขเอกสารรันไม่ซ้ำ', async () => {
    const a = await createSubmission(draft('u1'))
    const b = await createSubmission(draft('u1'))
    expect(a.docNumber).not.toBe(b.docNumber)
  })
  it('อัปเดตทับของเดิม docNumber คงเดิม', async () => {
    const s = await createSubmission(draft('u2'))
    await updateSubmission(s.id, { ...s, header: { ...s.header, firstName: 'changed' } })
    const list = await listMySubmissions('u2')
    const found = list.find(x => x.id === s.id)!
    expect(found.docNumber).toBe(s.docNumber)
    expect(found.header.firstName).toBe('changed')
  })
  it('incrementPrint เพิ่ม printCount', async () => {
    const s = await createSubmission(draft('u3'))
    await incrementPrint(s.id)
    const list = await listMySubmissions('u3')
    expect(list.find(x => x.id === s.id)!.printCount).toBe(1)
  })
})
```

- [ ] **Step 2: รันให้ FAIL**

Run: `npm test -- src/data/submissions`
Expected: FAIL

- [ ] **Step 3: เขียน implementation**

`src/data/submissions.ts`:
```ts
import { db } from '../lib/firebase'
import {
  collection, doc, getDoc, getDocs, query, where, orderBy,
  runTransaction, setDoc, updateDoc,
} from 'firebase/firestore'
import { Submission } from '../types/schema'
import { formatDocNumber } from '../shared/docNumber'

const FORM_PREFIX: Record<string, string> = { 'expense-claim': 'GAC6709-003' }

export type SubmissionDraft = Omit<Submission,
  'id' | 'docNumber' | 'createdAt' | 'updatedAt' | 'printCount' | 'lastPrintedAt'>

export async function createSubmission(dr: SubmissionDraft): Promise<Submission> {
  const now = Date.now()
  const id = doc(collection(db, 'submissions')).id
  const counterRef = doc(db, 'counters', dr.formType)
  const submissionRef = doc(db, 'submissions', id)

  const docNumber = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef)
    const last = counterSnap.exists() ? (counterSnap.data().lastNumber as number) : 0
    const next = last + 1
    const num = formatDocNumber(FORM_PREFIX[dr.formType], new Date(now), next)
    tx.set(counterRef, { lastNumber: next }, { merge: true })
    const full: Submission = { ...dr, id, docNumber: num, createdAt: now, updatedAt: now, printCount: 0, lastPrintedAt: null }
    tx.set(submissionRef, full)
    return num
  })

  return { ...dr, id, docNumber, createdAt: now, updatedAt: now, printCount: 0, lastPrintedAt: null }
}

export async function updateSubmission(id: string, s: Submission): Promise<void> {
  await updateDoc(doc(db, 'submissions', id), {
    header: s.header, items: s.items, totals: s.totals, updatedAt: Date.now(),
  })
}

export async function incrementPrint(id: string): Promise<void> {
  const ref = doc(db, 'submissions', id)
  const snap = await getDoc(ref)
  const count = snap.exists() ? (snap.data().printCount as number) : 0
  await updateDoc(ref, { printCount: count + 1, lastPrintedAt: Date.now() })
}

export async function listMySubmissions(uid: string): Promise<Submission[]> {
  const q = query(collection(db, 'submissions'), where('createdBy', '==', uid), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Submission)
}

export async function listAllSubmissions(): Promise<Submission[]> {
  const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Submission)
}
```

- [ ] **Step 4: รันให้ PASS**

Run: `npm test -- src/data/submissions`
Expected: passed

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: submissions data layer + doc number transaction"
```

---

### Task 11: Firestore security rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: เขียน rules**

`firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function myRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    function isAdmin() { return isSignedIn() && myRole() == 'admin'; }

    match /companies/{id} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    match /users/{uid} {
      allow read: if isSignedIn() && (request.auth.uid == uid || isAdmin());
      allow create, update: if isAdmin() || request.auth.uid == uid;
    }
    match /submissions/{id} {
      allow read: if isSignedIn() && (resource.data.createdBy == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && request.resource.data.createdBy == request.auth.uid;
      allow update: if isSignedIn() && (resource.data.createdBy == request.auth.uid || isAdmin());
    }
    match /counters/{id} {
      allow read, write: if isSignedIn();
    }
  }
}
```

- [ ] **Step 2: ตรวจ syntax ด้วย emulator**

Run: `npx firebase emulators:exec --only firestore "echo rules ok"`
Expected: ไม่มี error ตอนโหลด rules

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: firestore security rules"
```

---

## Phase 3 — UI

### Task 12: Auth context + routing + guards

**Files:**
- Create: `src/auth/AuthProvider.tsx`, `src/auth/RequireAuth.tsx`, `src/auth/RequireAdmin.tsx`, `src/components/Layout.tsx`
- Modify: `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: เขียน AuthProvider**

`src/auth/AuthProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getProfileByUid } from '../data/users'
import { UserProfile } from '../types/schema'

interface AuthCtx { user: User | null; profile: UserProfile | null; loading: boolean; refresh: () => Promise<void> }
const Ctx = createContext<AuthCtx>({ user: null, profile: null, loading: true, refresh: async () => {} })
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(u: User | null) {
    setProfile(u ? await getProfileByUid(u.uid) : null)
  }
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u); await loadProfile(u); setLoading(false)
  }), [])

  return <Ctx.Provider value={{ user, profile, loading, refresh: () => loadProfile(user) }}>{children}</Ctx.Provider>
}
```

- [ ] **Step 2: เขียน guards**

`src/auth/RequireAuth.tsx`:
```tsx
import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from './AuthProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">กำลังโหลด...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
```
`src/auth/RequireAdmin.tsx`:
```tsx
import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from './AuthProvider'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="p-8">กำลังโหลด...</div>
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
```

- [ ] **Step 3: เขียน Layout + main.tsx (router)**

`src/components/Layout.tsx`:
```tsx
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { logout } from '../data/auth'

export default function Layout() {
  const { profile } = useAuth()
  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-4 border-b bg-white px-6 py-3">
        <Link to="/" className="font-medium">แบบฟอร์มเบิกจ่าย</Link>
        <Link to="/history">ประวัติ</Link>
        {profile?.role === 'admin' && <>
          <Link to="/admin/employees">พนักงาน</Link>
          <Link to="/admin/prints">ประวัติการพิมพ์</Link>
        </>}
        <span className="ml-auto text-sm text-gray-600">{profile?.firstName} {profile?.lastName}</span>
        <Link to="/change-password" className="text-sm">เปลี่ยนรหัส</Link>
        <button onClick={() => logout()} className="text-sm text-red-600">ออก</button>
      </nav>
      <main className="p-6"><Outlet /></main>
    </div>
  )
}
```
`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { RequireAdmin } from './auth/RequireAdmin'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ProfilePage from './pages/ProfilePage'
import DashboardPage from './pages/employee/DashboardPage'
import FormPage from './pages/employee/FormPage'
import HistoryPage from './pages/employee/HistoryPage'
import EmployeeListPage from './pages/admin/EmployeeListPage'
import AddEmployeePage from './pages/admin/AddEmployeePage'
import ImportCsvPage from './pages/admin/ImportCsvPage'
import PrintHistoryPage from './pages/admin/PrintHistoryPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/', element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'form', element: <FormPage /> },
      { path: 'form/:id', element: <FormPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'change-password', element: <ChangePasswordPage /> },
      { path: 'admin/employees', element: <RequireAdmin><EmployeeListPage /></RequireAdmin> },
      { path: 'admin/employees/new', element: <RequireAdmin><AddEmployeePage /></RequireAdmin> },
      { path: 'admin/import', element: <RequireAdmin><ImportCsvPage /></RequireAdmin> },
      { path: 'admin/prints', element: <RequireAdmin><PrintHistoryPage /></RequireAdmin> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AuthProvider><RouterProvider router={router} /></AuthProvider></React.StrictMode>
)
```

- [ ] **Step 4: ยืนยัน build ผ่าน (สร้าง page stub ชั่วคราวถ้าจำเป็น)**

หมายเหตุ: page ทั้งหมดจะถูกสร้างใน Task ถัดๆ ไป หากจะ build ทดสอบตอนนี้ ให้สร้าง stub `export default function X(){return null}` ชั่วคราว แล้วลบเมื่อทำจริง
Run: `npm run build`
Expected: build ผ่าน (หลังมี stub ครบ)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: auth context, router, guards, layout"
```

---

### Task 13: Login + Change password pages

**Files:**
- Create: `src/pages/LoginPage.tsx`, `src/pages/ChangePasswordPage.tsx`

- [ ] **Step 1: LoginPage**

`src/pages/LoginPage.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithEmployeeId } from '../data/auth'

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    try { await loginWithEmployeeId(employeeId, password); nav('/') }
    catch { setError('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง') }
  }
  return (
    <div className="mx-auto mt-24 max-w-sm rounded-lg border bg-white p-8">
      <h1 className="mb-6 text-xl font-medium">เข้าสู่ระบบ</h1>
      <form onSubmit={submit} className="space-y-4">
        <input className="w-full rounded border px-3 py-2" placeholder="รหัสพนักงาน"
          value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="รหัสผ่าน"
          value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-blue-600 py-2 text-white">เข้าสู่ระบบ</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: ChangePasswordPage**

`src/pages/ChangePasswordPage.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { changeMyPassword } from '../data/auth'
import { setMustChangePassword } from '../data/users'

export default function ChangePasswordPage() {
  const { user, refresh } = useAuth()
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState(''); const nav = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 6) return setMsg('รหัสผ่านอย่างน้อย 6 ตัว')
    if (pw !== pw2) return setMsg('รหัสผ่านไม่ตรงกัน')
    await changeMyPassword(user!, pw)
    await setMustChangePassword(user!.uid, false)
    await refresh()
    nav('/')
  }
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-medium">เปลี่ยนรหัสผ่าน</h1>
      <form onSubmit={submit} className="space-y-4">
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="รหัสผ่านใหม่"
          value={pw} onChange={e => setPw(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="ยืนยันรหัสผ่าน"
          value={pw2} onChange={e => setPw2(e.target.value)} />
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button className="w-full rounded bg-blue-600 py-2 text-white">บันทึก</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Component test (LoginPage แสดง error)**

`src/pages/LoginPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

vi.mock('../data/auth', () => ({ loginWithEmployeeId: vi.fn().mockRejectedValue(new Error('bad')) }))

describe('LoginPage', () => {
  it('แสดง error เมื่อล็อกอินล้มเหลว', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('เข้าสู่ระบบ', { selector: 'button' }))
    await waitFor(() => expect(screen.getByText(/ไม่ถูกต้อง/)).toBeInTheDocument())
  })
})
```

- [ ] **Step 4: รันเทสต์**

Run: `npm test -- LoginPage`
Expected: passed

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: login + change password pages"
```

---

### Task 14: Profile page

**Files:**
- Create: `src/pages/ProfilePage.tsx`
- Modify: `src/data/users.ts` (เพิ่ม `updateProfile`)

- [ ] **Step 1: เพิ่ม updateProfile ใน users.ts**

เพิ่มใน `src/data/users.ts`:
```ts
export async function updateProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (snap.exists()) await setDoc(doc(db, 'users', uid), { ...snap.data(), ...patch })
}
```

- [ ] **Step 2: ProfilePage**

`src/pages/ProfilePage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { updateProfile } from '../data/users'
import { listCompanies } from '../data/companies'
import { Company } from '../types/schema'

export default function ProfilePage() {
  const { profile, refresh } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState(profile)
  useEffect(() => { listCompanies().then(setCompanies) }, [])
  useEffect(() => setForm(profile), [profile])
  if (!form) return null

  async function save() { await updateProfile(form!.uid, form!); await refresh() }
  const set = (k: string, v: string) => setForm({ ...form!, [k]: v })

  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-xl font-medium">โปรไฟล์</h1>
      {[['firstName','ชื่อ'],['lastName','นามสกุล'],['position','ตำแหน่ง'],['department','แผนก'],['defaultJob','Job'],['bankAccount','เลขบัญชี']].map(([k,label]) => (
        <label key={k} className="block">
          <span className="text-sm text-gray-600">{label}</span>
          <input className="w-full rounded border px-3 py-2" value={(form as any)[k] || ''} onChange={e => set(k, e.target.value)} />
        </label>
      ))}
      <label className="block">
        <span className="text-sm text-gray-600">บริษัท/สังกัด</span>
        <select className="w-full rounded border px-3 py-2" value={form.companyId} onChange={e => set('companyId', e.target.value)}>
          <option value="">— เลือก —</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <button onClick={save} className="rounded bg-blue-600 px-4 py-2 text-white">บันทึก</button>
    </div>
  )
}
```

- [ ] **Step 3: ยืนยัน typecheck**

Run: `npx tsc --noEmit`
Expected: ไม่มี error

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: profile page + updateProfile"
```

---

### Task 15: Dashboard page

**Files:**
- Create: `src/pages/employee/DashboardPage.tsx`

- [ ] **Step 1: DashboardPage**

`src/pages/employee/DashboardPage.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'

export default function DashboardPage() {
  const { profile } = useAuth()
  return (
    <div>
      {profile?.mustChangePassword && (
        <div className="mb-4 rounded bg-yellow-50 p-3 text-sm">
          คุณยังใช้รหัสผ่านเริ่มต้น — <Link to="/change-password" className="text-blue-600 underline">เปลี่ยนรหัสผ่าน</Link>
        </div>
      )}
      <h1 className="mb-4 text-xl font-medium">เลือกฟอร์ม</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Link to="/form" className="rounded-lg border bg-white p-6 hover:shadow">
          <div className="font-medium">ใบเบิกค่าใช้จ่าย</div>
          <div className="text-sm text-gray-500">GAC6709-003</div>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: employee dashboard"
```

---

### Task 16: Expense claim form (กรอก + คำนวณ real-time + override)

**Files:**
- Create: `src/features/expense-claim/ExpenseClaimForm.tsx`

- [ ] **Step 1: เขียน component**

`src/features/expense-claim/ExpenseClaimForm.tsx`:
```tsx
import { ExpenseItem, ExpenseHeader, emptyItem } from '../../types/schema'
import { computeItem, computeTotals } from './calc'

interface Props {
  header: ExpenseHeader
  items: ExpenseItem[]
  onHeaderChange: (h: ExpenseHeader) => void
  onItemsChange: (items: ExpenseItem[]) => void
}

const CATEGORIES = ['ค่าไมล์เลทและค่าใช้จ่ายเดินทาง', 'ค่าใช้จ่ายต่างๆ', 'ค่าล่วงเวลา', 'ค่าเบี้ยเลี้ยง']

export default function ExpenseClaimForm({ header, items, onHeaderChange, onItemsChange }: Props) {
  const computed = items.map(computeItem)
  const totals = computeTotals(items)

  function setItem(idx: number, patch: Partial<ExpenseItem>) {
    onItemsChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }
  function setOverride(idx: number, field: keyof ExpenseItem, value: number, on: boolean) {
    const it = items[idx]
    setItem(idx, { [field]: value, overrides: { ...it.overrides, [field]: on } } as Partial<ExpenseItem>)
  }
  function toggleCategory(c: string) {
    const has = header.categories.includes(c)
    onHeaderChange({ ...header, categories: has ? header.categories.filter(x => x !== c) : [...header.categories, c] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {CATEGORIES.map(c => (
          <label key={c} className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={header.categories.includes(c)} onChange={() => toggleCategory(c)} /> {c}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <input className="rounded border px-2 py-1" placeholder="ชื่อ" value={header.firstName} onChange={e => onHeaderChange({ ...header, firstName: e.target.value })} />
        <input className="rounded border px-2 py-1" placeholder="นามสกุล" value={header.lastName} onChange={e => onHeaderChange({ ...header, lastName: e.target.value })} />
        <input className="rounded border px-2 py-1" placeholder="ตำแหน่ง" value={header.position} onChange={e => onHeaderChange({ ...header, position: e.target.value })} />
        <input className="rounded border px-2 py-1" placeholder="Job" value={header.job} onChange={e => onHeaderChange({ ...header, job: e.target.value })} />
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>{['วันเดือนปี','PC Code','PC Name','วันทำงาน','วันละ','ธนาคาร','ก่อนหัก','หัก3%','สุทธิ',''].map(h => <th key={h} className="border px-1 py-1">{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="border p-1"><input className="w-24" value={it.date} onChange={e => setItem(i, { date: e.target.value })} /></td>
              <td className="border p-1"><input className="w-20" value={it.pcCode} onChange={e => setItem(i, { pcCode: e.target.value })} /></td>
              <td className="border p-1"><input className="w-32" value={it.pcName} onChange={e => setItem(i, { pcName: e.target.value })} /></td>
              <td className="border p-1"><input type="number" className="w-16" value={it.workDays} onChange={e => setItem(i, { workDays: Number(e.target.value) })} /></td>
              <td className="border p-1"><input type="number" className="w-16" value={it.ratePerDay} onChange={e => setItem(i, { ratePerDay: Number(e.target.value) })} /></td>
              <td className="border p-1"><input className="w-28" value={it.bankAccount} onChange={e => setItem(i, { bankAccount: e.target.value })} /></td>
              <td className="border p-1 text-right">{computed[i].amountBeforeWht.toLocaleString()}</td>
              <td className="border p-1 text-right">
                <input type="number" className="w-16 text-right" value={computed[i].wht3}
                  onChange={e => setOverride(i, 'wht3', Number(e.target.value), true)} />
                <label className="block text-[10px]"><input type="checkbox" checked={!!it.overrides.wht3}
                  onChange={e => setOverride(i, 'wht3', computed[i].wht3, e.target.checked)} /> แก้เอง</label>
              </td>
              <td className="border p-1 text-right">{computed[i].amountNet.toLocaleString()}</td>
              <td className="border p-1"><button className="text-red-600" onClick={() => onItemsChange(items.filter((_, x) => x !== i))}>ลบ</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-medium">
            <td className="border p-1 text-right" colSpan={6}>รวมทั้งสิ้น</td>
            <td className="border p-1 text-right">{totals.totalBefore.toLocaleString()}</td>
            <td className="border p-1 text-right">{totals.totalWht.toLocaleString()}</td>
            <td className="border p-1 text-right">{totals.totalNet.toLocaleString()}</td>
            <td className="border"></td>
          </tr>
        </tfoot>
      </table>
      <button className="rounded border px-3 py-1 text-sm" onClick={() => onItemsChange([...items, emptyItem()])}>+ เพิ่มแถว</button>
      <p className="text-sm">เป็นจำนวนเงิน: <b>{totals.amountInThaiText}</b></p>
    </div>
  )
}
```

- [ ] **Step 2: Component test (คำนวณ real-time)**

`src/features/expense-claim/ExpenseClaimForm.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExpenseClaimForm from './ExpenseClaimForm'
import { emptyItem } from '../../types/schema'

const header = { subject: '', categories: [], companyId: 'globe', firstName: '', lastName: '', position: '', job: '' }

describe('ExpenseClaimForm', () => {
  it('แสดงยอดรวมและตัวอักษรไทยจากรายการ', () => {
    const items = [{ ...emptyItem(), workDays: 27, ratePerDay: 500 }]
    render(<ExpenseClaimForm header={header} items={items} onHeaderChange={() => {}} onItemsChange={() => {}} />)
    expect(screen.getByText('หนึ่งหมื่นสามพันเก้าสิบห้าบาทถ้วน')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: รันเทสต์**

Run: `npm test -- ExpenseClaimForm`
Expected: passed

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: expense claim form with realtime calc + override"
```

---

### Task 17: Preview + print layout

**Files:**
- Create: `src/features/expense-claim/ExpenseClaimPreview.tsx`, `src/print.css`
- Modify: `src/index.css` (import print.css)

- [ ] **Step 1: print.css**

`src/print.css`:
```css
@media print {
  body * { visibility: hidden; }
  #print-area, #print-area * { visibility: visible; }
  #print-area { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
```
เพิ่มใน `src/index.css` ท้ายไฟล์: `@import './print.css';`

- [ ] **Step 2: Preview component**

`src/features/expense-claim/ExpenseClaimPreview.tsx`:
```tsx
import { Company, ExpenseHeader, ExpenseItem } from '../../types/schema'
import { computeItem, computeTotals } from './calc'

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseItem[]; docNumber: string }

export default function ExpenseClaimPreview({ company, header, items, docNumber }: Props) {
  const computed = items.map(computeItem)
  const totals = computeTotals(items)
  return (
    <div id="print-area" className="mx-auto max-w-3xl bg-white p-8 text-sm">
      <div className="text-center font-medium">{company?.name}</div>
      <div className="text-center text-xs">{company?.address}</div>
      <div className="text-right text-xs">{docNumber}</div>
      <div className="mt-2">เรื่อง ขออนุมัติเบิกค่าใช้จ่าย &nbsp; หมวด: {header.categories.join(', ')}</div>
      <div>เรียน ท่านผู้จัดการ</div>
      <div className="mt-1">ชื่อ {header.firstName} {header.lastName} ตำแหน่ง {header.position} Job {header.job}</div>
      <table className="mt-3 w-full border-collapse border text-xs">
        <thead><tr>{['วันเดือนปี','PC Code','PC Name','วันทำงาน','วันละ','ธนาคาร','ก่อนหัก','หัก3%','สุทธิ'].map(h => <th key={h} className="border px-1">{h}</th>)}</tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="border px-1">{it.date}</td><td className="border px-1">{it.pcCode}</td>
              <td className="border px-1">{it.pcName}</td><td className="border px-1 text-center">{it.workDays}</td>
              <td className="border px-1 text-right">{it.ratePerDay}</td><td className="border px-1">{it.bankAccount}</td>
              <td className="border px-1 text-right">{computed[i].amountBeforeWht.toLocaleString()}</td>
              <td className="border px-1 text-right">{computed[i].wht3.toLocaleString()}</td>
              <td className="border px-1 text-right">{computed[i].amountNet.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="font-medium"><td className="border px-1 text-right" colSpan={6}>รวมทั้งสิ้น</td>
            <td className="border px-1 text-right">{totals.totalBefore.toLocaleString()}</td>
            <td className="border px-1 text-right">{totals.totalWht.toLocaleString()}</td>
            <td className="border px-1 text-right">{totals.totalNet.toLocaleString()}</td></tr>
        </tbody>
      </table>
      <div className="mt-2">เป็นจำนวนเงิน {totals.amountInThaiText}</div>
      <div className="mt-8 grid grid-cols-3 gap-8 text-center text-xs">
        <div>....................<br/>ผู้เบิก</div><div>....................<br/>หัวหน้าแผนก</div><div>....................<br/>ผู้อนุมัติ</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ยืนยัน typecheck**

Run: `npx tsc --noEmit`
Expected: ไม่มี error

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: expense claim preview + print layout"
```

---

### Task 18: PDF document (@react-pdf + Sarabun)

**Files:**
- Create: `src/features/expense-claim/ExpenseClaimPdf.tsx`
- Add: `public/fonts/Sarabun-Regular.ttf`, `public/fonts/Sarabun-Bold.ttf`

- [ ] **Step 1: ดาวน์โหลดฟอนต์ Sarabun**

ดาวน์โหลด Sarabun (SIL Open Font License) จาก Google Fonts วางไว้ที่ `public/fonts/Sarabun-Regular.ttf` และ `Sarabun-Bold.ttf`
(หมายเหตุ: ต้องขออนุญาต user ก่อนดาวน์โหลดไฟล์ตามนโยบาย — แจ้ง user ให้วางฟอนต์เอง หรือยืนยันก่อนโหลด)

- [ ] **Step 2: เขียน PDF component**

`src/features/expense-claim/ExpenseClaimPdf.tsx`:
```tsx
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import { Company, ExpenseHeader, ExpenseItem } from '../../types/schema'
import { computeItem, computeTotals } from './calc'

Font.register({ family: 'Sarabun', fonts: [
  { src: '/fonts/Sarabun-Regular.ttf' },
  { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
]})

const s = StyleSheet.create({
  page: { fontFamily: 'Sarabun', fontSize: 9, padding: 28 },
  center: { textAlign: 'center' }, right: { textAlign: 'right' },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: '#000', padding: 2, flexGrow: 1 },
  bold: { fontWeight: 'bold' },
})

interface Props { company: Company | null; header: ExpenseHeader; items: ExpenseItem[]; docNumber: string }

export function ExpenseClaimPdf({ company, header, items, docNumber }: Props) {
  const computed = items.map(computeItem)
  const totals = computeTotals(items)
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={[s.center, s.bold]}>{company?.name}</Text>
        <Text style={s.center}>{company?.address}</Text>
        <Text style={s.right}>{docNumber}</Text>
        <Text>เรื่อง ขออนุมัติเบิกค่าใช้จ่าย หมวด: {header.categories.join(', ')}</Text>
        <Text>ชื่อ {header.firstName} {header.lastName} ตำแหน่ง {header.position} Job {header.job}</Text>
        <View style={{ marginTop: 6 }}>
          <View style={[s.row, s.bold]}>
            {['วันเดือนปี','PC Code','PC Name','วันทำงาน','วันละ','ก่อนหัก','หัก3%','สุทธิ'].map(h => <Text key={h} style={s.cell}>{h}</Text>)}
          </View>
          {items.map((it, i) => (
            <View style={s.row} key={i}>
              <Text style={s.cell}>{it.date}</Text><Text style={s.cell}>{it.pcCode}</Text>
              <Text style={s.cell}>{it.pcName}</Text><Text style={s.cell}>{it.workDays}</Text>
              <Text style={s.cell}>{it.ratePerDay}</Text>
              <Text style={[s.cell, s.right]}>{computed[i].amountBeforeWht.toLocaleString()}</Text>
              <Text style={[s.cell, s.right]}>{computed[i].wht3.toLocaleString()}</Text>
              <Text style={[s.cell, s.right]}>{computed[i].amountNet.toLocaleString()}</Text>
            </View>
          ))}
          <View style={[s.row, s.bold]}>
            <Text style={[s.cell, { flexGrow: 5 }, s.right]}>รวมทั้งสิ้น</Text>
            <Text style={[s.cell, s.right]}>{totals.totalBefore.toLocaleString()}</Text>
            <Text style={[s.cell, s.right]}>{totals.totalWht.toLocaleString()}</Text>
            <Text style={[s.cell, s.right]}>{totals.totalNet.toLocaleString()}</Text>
          </View>
        </View>
        <Text style={{ marginTop: 4 }}>เป็นจำนวนเงิน {totals.amountInThaiText}</Text>
        <View style={[s.row, { marginTop: 40, justifyContent: 'space-around' }]}>
          <Text>............... ผู้เบิก</Text><Text>............... หัวหน้าแผนก</Text><Text>............... ผู้อนุมัติ</Text>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 3: ยืนยัน typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: ผ่าน

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: expense claim PDF document"
```

---

### Task 19: FormPage (ประกอบร่าง: กรอก→preview→บันทึก→PDF→พิมพ์) + แก้ไขย้อนหลัง

**Files:**
- Create: `src/pages/employee/FormPage.tsx`
- Modify: `src/data/submissions.ts` (เพิ่ม `getSubmission`)

- [ ] **Step 1: เพิ่ม getSubmission**

เพิ่มใน `src/data/submissions.ts`:
```ts
export async function getSubmission(id: string): Promise<Submission | null> {
  const snap = await getDoc(doc(db, 'submissions', id))
  return snap.exists() ? (snap.data() as Submission) : null
}
```

- [ ] **Step 2: FormPage**

`src/pages/employee/FormPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { useAuth } from '../../auth/AuthProvider'
import { ExpenseHeader, ExpenseItem, emptyItem, Company } from '../../types/schema'
import { computeTotals } from '../../features/expense-claim/calc'
import ExpenseClaimForm from '../../features/expense-claim/ExpenseClaimForm'
import ExpenseClaimPreview from '../../features/expense-claim/ExpenseClaimPreview'
import { ExpenseClaimPdf } from '../../features/expense-claim/ExpenseClaimPdf'
import { createSubmission, updateSubmission, getSubmission, incrementPrint } from '../../data/submissions'
import { getCompany } from '../../data/companies'

export default function FormPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [docNumber, setDocNumber] = useState('(ยังไม่บันทึก)')
  const [savedId, setSavedId] = useState<string | null>(id ?? null)
  const [showPreview, setShowPreview] = useState(false)
  const [header, setHeader] = useState<ExpenseHeader>({
    subject: 'ขออนุมัติเบิกค่าใช้จ่าย', categories: [], companyId: profile?.companyId ?? '',
    firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '',
    position: profile?.position ?? '', job: profile?.defaultJob ?? '',
  })
  const [items, setItems] = useState<ExpenseItem[]>([emptyItem()])

  useEffect(() => { // โหลดใบเดิมกรณีแก้ไข
    if (id) getSubmission(id).then(s => {
      if (s) { setHeader(s.header); setItems(s.items); setDocNumber(s.docNumber); setSavedId(s.id) }
    })
  }, [id])
  useEffect(() => { if (header.companyId) getCompany(header.companyId).then(setCompany) }, [header.companyId])

  async function save() {
    const totals = computeTotals(items)
    if (savedId) {
      const existing = await getSubmission(savedId)
      if (existing) await updateSubmission(savedId, { ...existing, header, items, totals })
    } else {
      const created = await createSubmission({
        formType: 'expense-claim', header, items, totals,
        createdBy: user!.uid, createdByEmployeeId: profile!.employeeId,
      })
      setSavedId(created.id); setDocNumber(created.docNumber)
    }
    alert('บันทึกแล้ว')
  }

  async function downloadPdf() {
    const blob = await pdf(<ExpenseClaimPdf company={company} header={header} items={items} docNumber={docNumber} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${docNumber}.pdf`; a.click()
    if (savedId) await incrementPrint(savedId)
  }
  async function print() {
    if (savedId) await incrementPrint(savedId)
    window.print()
  }

  return (
    <div>
      <div className="no-print space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium">ใบเบิกค่าใช้จ่าย</h1>
          <span className="text-sm text-gray-500">{docNumber}</span>
          <button className="ml-auto rounded border px-3 py-1" onClick={() => setShowPreview(!showPreview)}>{showPreview ? 'แก้ไข' : 'ดูตัวอย่าง'}</button>
        </div>
        {!showPreview && <ExpenseClaimForm header={header} items={items} onHeaderChange={setHeader} onItemsChange={setItems} />}
        <div className="flex gap-2">
          <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={save}>บันทึก</button>
          <button className="rounded border px-4 py-2" onClick={downloadPdf}>ดาวน์โหลด PDF</button>
          <button className="rounded border px-4 py-2" onClick={print}>สั่งพิมพ์</button>
          <button className="rounded border px-4 py-2" onClick={() => nav('/history')}>ไปหน้าประวัติ</button>
        </div>
      </div>
      {(showPreview || true) && <ExpenseClaimPreview company={company} header={header} items={items} docNumber={docNumber} />}
    </div>
  )
}
```
หมายเหตุ: `ExpenseClaimPreview` มี `id="print-area"` — CSS print จะพิมพ์เฉพาะส่วนนี้

- [ ] **Step 3: ยืนยัน build**

Run: `npm run build`
Expected: ผ่าน

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: form page (create/edit/save/pdf/print)"
```

---

### Task 20: History page (ของพนักงาน)

**Files:**
- Create: `src/pages/employee/HistoryPage.tsx`

- [ ] **Step 1: HistoryPage**

`src/pages/employee/HistoryPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { listMySubmissions } from '../../data/submissions'
import { Submission } from '../../types/schema'

export default function HistoryPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Submission[]>([])
  useEffect(() => { if (user) listMySubmissions(user.uid).then(setRows) }, [user])
  return (
    <div>
      <h1 className="mb-4 text-xl font-medium">ประวัติเอกสารของฉัน</h1>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['เลขที่','วันที่','ยอดสุทธิ','พิมพ์แล้ว(ครั้ง)',''].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.docNumber}</td>
              <td className="border px-2 py-1">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
              <td className="border px-2 py-1 text-right">{r.totals.totalNet.toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1"><Link className="text-blue-600" to={`/form/${r.id}`}>แก้ไข / พิมพ์ใหม่</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: employee history page"
```

---

### Task 21: Admin — employee list, add, CSV import

**Files:**
- Create: `src/pages/admin/EmployeeListPage.tsx`, `src/pages/admin/AddEmployeePage.tsx`, `src/pages/admin/ImportCsvPage.tsx`
- Modify: `src/data/users.ts` (เพิ่ม `importEmployees`)

- [ ] **Step 1: เพิ่ม importEmployees + เทสต์**

เพิ่มใน `src/data/users.ts`:
```ts
import { CsvEmployeeRow } from '../shared/csv'
export async function importEmployees(rows: CsvEmployeeRow[]): Promise<{ ok: number; failed: { employeeId: string; reason: string }[] }> {
  let ok = 0; const failed: { employeeId: string; reason: string }[] = []
  for (const r of rows) {
    try { await createEmployee(r); ok++ }
    catch (e: any) { failed.push({ employeeId: r.employeeId, reason: e?.code || 'error' }) }
  }
  return { ok, failed }
}
```
`src/data/users.import.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { importEmployees } from './users'

describe('importEmployees', () => {
  it('เพิ่มหลายคนและรายงานผล', async () => {
    const res = await importEmployees([
      { employeeId: '777001', firstName: 'a', lastName: 'b', position: '', department: '', companyId: 'globe', defaultJob: '', bankAccount: '', role: 'employee' },
    ])
    expect(res.ok).toBe(1)
  })
})
```
Run: `npm test -- users.import` → passed

- [ ] **Step 2: EmployeeListPage**

`src/pages/admin/EmployeeListPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEmployees } from '../../data/users'
import { UserProfile } from '../../types/schema'

export default function EmployeeListPage() {
  const [rows, setRows] = useState<UserProfile[]>([])
  const [q, setQ] = useState('')
  useEffect(() => { listEmployees().then(setRows) }, [])
  const filtered = rows.filter(r => (r.employeeId + r.firstName + r.lastName).includes(q))
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-medium">พนักงาน</h1>
        <input className="rounded border px-2 py-1" placeholder="ค้นหา" value={q} onChange={e => setQ(e.target.value)} />
        <Link to="/admin/employees/new" className="ml-auto rounded bg-blue-600 px-3 py-1 text-white">+ เพิ่มพนักงาน</Link>
        <Link to="/admin/import" className="rounded border px-3 py-1">Import CSV</Link>
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['รหัส','ชื่อ-นามสกุล','ตำแหน่ง','แผนก','บริษัท','สิทธิ์'].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.uid}>
              <td className="border px-2 py-1">{r.employeeId}</td>
              <td className="border px-2 py-1">{r.firstName} {r.lastName}</td>
              <td className="border px-2 py-1">{r.position}</td>
              <td className="border px-2 py-1">{r.department}</td>
              <td className="border px-2 py-1">{r.companyId}</td>
              <td className="border px-2 py-1">{r.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: AddEmployeePage**

`src/pages/admin/AddEmployeePage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEmployee } from '../../data/users'
import { listCompanies } from '../../data/companies'
import { Company } from '../../types/schema'

export default function AddEmployeePage() {
  const nav = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [f, setF] = useState({ employeeId: '', firstName: '', lastName: '', position: '', department: '', companyId: '', defaultJob: '', bankAccount: '', role: 'employee' as const })
  useEffect(() => { listCompanies().then(setCompanies) }, [])
  const set = (k: string, v: string) => setF({ ...f, [k]: v })
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await createEmployee(f as any)
    alert('เพิ่มพนักงานแล้ว (รหัสผ่านเริ่มต้น = รหัสพนักงาน)')
    nav('/admin/employees')
  }
  return (
    <form onSubmit={submit} className="max-w-lg space-y-3">
      <h1 className="text-xl font-medium">เพิ่มพนักงาน</h1>
      {[['employeeId','รหัสพนักงาน'],['firstName','ชื่อ'],['lastName','นามสกุล'],['position','ตำแหน่ง'],['department','แผนก'],['defaultJob','Job'],['bankAccount','เลขบัญชี']].map(([k,l]) => (
        <input key={k} className="w-full rounded border px-3 py-2" placeholder={l} value={(f as any)[k]} onChange={e => set(k, e.target.value)} />
      ))}
      <select className="w-full rounded border px-3 py-2" value={f.companyId} onChange={e => set('companyId', e.target.value)}>
        <option value="">— เลือกบริษัท —</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="w-full rounded border px-3 py-2" value={f.role} onChange={e => set('role', e.target.value)}>
        <option value="employee">พนักงาน</option><option value="admin">แอดมิน</option>
      </select>
      <button className="rounded bg-blue-600 px-4 py-2 text-white">บันทึก</button>
    </form>
  )
}
```

- [ ] **Step 4: ImportCsvPage**

`src/pages/admin/ImportCsvPage.tsx`:
```tsx
import { useState } from 'react'
import { parseEmployeeCsv } from '../../shared/csv'
import { importEmployees } from '../../data/users'

export default function ImportCsvPage() {
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<string>('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const text = await file.text()
    const { rows, errors } = parseEmployeeCsv(text)
    setErrors(errors)
    if (errors.length === 0) {
      const res = await importEmployees(rows)
      setResult(`เพิ่มสำเร็จ ${res.ok} คน, ล้มเหลว ${res.failed.length} คน`)
    }
  }
  return (
    <div className="max-w-lg space-y-3">
      <h1 className="text-xl font-medium">Import พนักงานจาก CSV</h1>
      <p className="text-sm text-gray-600">คอลัมน์: employeeId, firstName, lastName, position, department, companyId, defaultJob, bankAccount, role</p>
      <input type="file" accept=".csv" onChange={onFile} />
      {errors.length > 0 && <ul className="text-sm text-red-600">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
      {result && <p className="text-sm text-green-700">{result}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: admin employee list, add, csv import"
```

---

### Task 22: Admin — print history (ทุกคน)

**Files:**
- Create: `src/pages/admin/PrintHistoryPage.tsx`

- [ ] **Step 1: PrintHistoryPage**

`src/pages/admin/PrintHistoryPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { listAllSubmissions } from '../../data/submissions'
import { Submission } from '../../types/schema'

export default function PrintHistoryPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [emp, setEmp] = useState('')
  useEffect(() => { listAllSubmissions().then(setRows) }, [])
  const filtered = rows.filter(r => r.createdByEmployeeId.includes(emp))
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-medium">ประวัติการพิมพ์ทั้งหมด</h1>
        <input className="rounded border px-2 py-1" placeholder="กรองด้วยรหัสพนักงาน" value={emp} onChange={e => setEmp(e.target.value)} />
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-gray-50"><tr>{['เลขที่','รหัสพนง.','วันที่สร้าง','ยอดสุทธิ','พิมพ์(ครั้ง)','พิมพ์ล่าสุด'].map(h => <th key={h} className="border px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.docNumber}</td>
              <td className="border px-2 py-1">{r.createdByEmployeeId}</td>
              <td className="border px-2 py-1">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
              <td className="border px-2 py-1 text-right">{r.totals.totalNet.toLocaleString()}</td>
              <td className="border px-2 py-1 text-center">{r.printCount}</td>
              <td className="border px-2 py-1">{r.lastPrintedAt ? new Date(r.lastPrintedAt).toLocaleString('th-TH') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: admin print history"
```

---

## Phase 4 — Seed + Deploy

### Task 23: Seed script (companies + admin คนแรก)

**Files:**
- Create: `scripts/seed.ts`

- [ ] **Step 1: เขียน seed script (รันกับ emulator หรือ production ครั้งเดียว)**

`scripts/seed.ts`:
```ts
// รันด้วย: npx tsx scripts/seed.ts   (ต้องตั้ง env ให้ชี้ emulator หรือ prod)
import { secondaryAuth, db } from '../src/lib/firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { employeeIdToEmail } from '../src/data/auth'

async function main() {
  // บริษัท — แก้ที่อยู่ให้ตรงจริงก่อนรัน
  await setDoc(doc(db, 'companies', 'globe'), {
    name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด',
    address: '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น6 ถ.พัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ',
  })
  await setDoc(doc(db, 'companies', 'besthrm'), {
    name: 'บริษัท เบสท์ เอช อาร์ เอ็ม จำกัด', address: 'REPLACE_ADDRESS',
  })
  // admin คนแรก (รหัส admin001)
  const cred = await createUserWithEmailAndPassword(secondaryAuth, employeeIdToEmail('admin001'), 'admin001')
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid, employeeId: 'admin001', firstName: 'ผู้ดูแล', lastName: 'ระบบ',
    position: 'Admin', department: 'IT', companyId: 'globe', defaultJob: '', bankAccount: '',
    role: 'admin', mustChangePassword: true, createdAt: Date.now(),
  })
  console.log('seed done')
}
main()
```
ติดตั้ง tsx: `npm install -D tsx`

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore: seed script for companies + first admin"
```

---

### Task 24: Full manual verification + deploy

**Files:** —

- [ ] **Step 1: รัน emulator + seed + dev, ทดสอบครบวงจรด้วยมือ**

```bash
npx firebase emulators:start   # terminal 1
npx tsx scripts/seed.ts        # terminal 2 (ครั้งเดียว)
npm run dev                    # terminal 3
```
เช็ก: login admin001/admin001 → เปลี่ยนรหัส → เพิ่มพนักงาน → import CSV → login พนักงาน → กรอกใบเบิก → บันทึก(ได้เลขเอกสาร) → ดาวน์โหลด PDF (ตัวอักษรไทยคมชัด) → สั่งพิมพ์ → หน้าประวัติ แก้ไข → พิมพ์ใหม่ → admin ดูประวัติการพิมพ์เห็นครบ

- [ ] **Step 2: กรอก Firebase config จริงใน .env.local + ตั้ง VITE_USE_EMULATOR=false**

(ผู้ใช้สร้าง Firebase project จริง + เปิด Auth email/password ใน console; ตั้งบัญชี admin ผ่าน seed บน prod)

- [ ] **Step 3: Deploy**

```bash
npm run build
npx firebase deploy --only firestore:rules,hosting
```
Expected: ได้ URL hosting ใช้งานได้

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: deployment ready"
```

---

## หมายเหตุ / ข้อควรระวังตอนลงมือ
- **ดาวน์โหลดไฟล์ (ฟอนต์ Sarabun):** ตามนโยบายต้องยืนยันกับ user ก่อนดาวน์โหลด — แนะนำให้ user วางไฟล์ฟอนต์เอง หรือขออนุญาตก่อน (Task 18)
- **การตั้งค่าบัญชี admin คนแรก / Firebase project จริง:** เป็นงานของ user (ต้องใช้รหัสผ่าน) — ผู้พัฒนาไม่ควรกรอกรหัสผ่านแทน
- **ที่อยู่บริษัท besthrm** และรายละเอียดหัวฟอร์มจริง: รอ user ยืนยัน (ดูสเปกข้อ 11)
- **cell mapping ของ PDF ให้ตรงต้นฉบับเป๊ะ:** ปรับ layout/สไตล์ใน `ExpenseClaimPdf.tsx` และ `ExpenseClaimPreview.tsx` ตามฟอร์มจริงในรอบ polish หลังใช้งานได้
```
