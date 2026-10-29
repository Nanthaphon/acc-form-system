// In-memory stand-in for the Supabase client, holding made-up demo data.
// `npm run dev:demo` runs the real app on it: try a change, sign, cancel,
// delete — nothing reaches the real database, and a reload starts over.
// Also what the training manual's screenshots are taken from. Never shipped:
// only demo/vite.config.mjs swaps it in for src/lib/supabase.
//
// Who is signed in: ?demo=admin (บัญชี, admin) · ?demo=super (Super Admin) ·
// none (an employee). ?demo=nosig / first for a fresh account.
/* eslint-disable @typescript-eslint/no-explicit-any */

const params = new URLSearchParams(location.search)
const DEMO = params.get('demo') ?? ''           // 'first' = first login, 'nosig' = no signature yet

const t = (iso: string) => new Date(iso).getTime()
const sig = (d: string, color = '#1d3557') =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 90"><path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`)
const SIG_ME = sig('M14 62 C30 20 44 18 46 44 C48 70 34 74 40 52 C48 26 66 26 70 50 C73 66 84 40 96 38 C108 36 104 64 118 58 C132 52 136 30 150 36 C162 42 150 66 170 58 C186 52 198 40 226 34')
const SIG_WIPA = sig('M16 58 C26 30 40 26 50 48 C58 66 64 30 78 30 C92 30 86 62 102 56 C118 50 120 34 138 40 C156 46 160 60 182 50 C200 42 210 46 224 40', '#0b3c8a')
const SIG_PRASERT = sig('M20 64 C40 22 58 24 60 50 C62 70 80 30 96 34 C112 38 104 60 124 54 C142 48 150 26 172 34 C190 40 196 56 222 46', '#222')
const SIG_ANUCHA = sig('M18 56 C34 28 52 30 56 52 C60 72 76 34 92 40 C108 46 100 66 120 58 C140 50 146 30 166 38 C182 44 190 58 220 44', '#123')

const SOMCHAI = 'u-somchai'
// who is signed in: an employee by default, the accounting team's Account
// Admin with ?demo=admin, the Super Admin with ?demo=super
const ME = DEMO === 'admin' ? 'u-malee' : DEMO === 'super' ? 'u-admin' : SOMCHAI
const people = {
  me: { uid: SOMCHAI, name: 'สมชาย ใจดี' },
  wipa: { uid: 'u-wipa', name: 'วิภา รัตนกุล' },
  prasert: { uid: 'u-prasert', name: 'ประเสริฐ วงศ์ทอง' },
  malee: { uid: 'u-malee', name: 'มาลี ศรีสุข' },
  anucha: { uid: 'u-anucha', name: 'อนุชา พรหมมา' },
}

const profile = (uid: string, employeeId: string, firstName: string, lastName: string, position: string, extra: any = {}) => ({
  uid, employeeId, firstName, lastName, position, department: 'Field Operation', companyId: 'globe',
  defaultJob: 'J2610-015', bankAccount: '123-4-56789-0', role: 'employee', mustChangePassword: false,
  accessGroup: 'dx', createdAt: t('2026-08-01'), signatureImage: null, isSuperAdmin: false, passwordIsDefault: false, ...extra,
})

const GROUP_MAIN = 'g-expense'
const GROUP_DX = 'g-expense-dx'

const NOTES = [
  '1. พนักงานจะต้องเคลียร์ค่าใช้จ่ายทุกวันอังคารและพฤหัสบดี',
  '2. พนักงานที่ซื้อของด้วยตนเองมีหน้าที่ต้องตรวจชื่อและที่อยู่ที่ลงในใบกำกับภาษีว่าถูกต้องหรือไม่ ถ้าผิดพนักงานต้องรับผิดชอบเปลี่ยนบิลเอง',
  '3. ใบกำกับภาษีของค่าน้ำมันจะต้องระบุเลขทะเบียนรถคันที่พนักงานเอาไปใช้ด้วยทุกครั้ง',
  '4. ใบเบิกค่าใช้จ่ายต่อ 1 ชุด ค่าใช้จ่ายทุกรายการจะต้องเป็นบริษัทเดียวกันและเดือนเดียวกัน',
]
const BLOCKS5 = [
  { id: 'requester', label: 'ผู้เบิก' }, { id: 'head', label: 'หัวหน้าแผนก' }, { id: 'approver', label: 'ผู้อนุมัติ' },
  { id: 'receiver', label: 'ผู้รับเงิน' }, { id: 'checker', label: 'ผู้ตรวจสอบ/ฝ่ายบัญชี' },
]

const claimForm = (formType: string, groupId: string, accessGroups: string[]) => ({
  formType, name: 'ใบเบิกค่าใช้จ่าย', title: 'ใบขออนุมัติเบิกค่าใช้จ่าย', subject: '', attention: '', formCode: 'GAC69-005',
  categories: ['ค่าไมล์เลทและค่าใช้จ่ายเดินทาง', 'ค่าใช้จ่ายต่างๆ', 'ค่าจองตั๋วเครื่องบินเดินทาง', 'ค่าเบี้ยเลี้ยง'],
  notes: NOTES,
  columns: [
    { key: 'docDate', label: 'วันเดือนปี', type: 'date', width: 20 },
    { key: 'pcCode', label: 'PC Code', type: 'text', width: 16 },
    { key: 'pcName', label: 'PC Name', type: 'text' },
    { key: 'workDays', label: 'วันทำงาน', type: 'number', width: 14 },
    { key: 'ratePerDay', label: 'วันละ', type: 'number', width: 15 },
    { key: 'bank', label: 'ธนาคาร', type: 'select', width: 19, options: ['กสิกรไทย', 'ไทยพาณิชย์', 'กรุงเทพ', 'กรุงไทย', 'กรุงศรีอยุธยา'] },
    { key: 'job', label: 'Job', type: 'text', width: 17 },
    ...(DEMO === 'img' ? [{ key: 'bookImg', label: 'หลักฐานเลขบัญชี', type: 'image', width: 22 }] : []),
    ...(DEMO === 'dx'
      ? [{ key: 'amountBefore', label: 'จำนวนเงิน', type: 'number', width: 20, isTotal: true }]
      : [{ key: 'amountBefore', label: 'จำนวนเงิน', type: 'calc', width: 20, isTotal: true, calc: { op: 'multiply', operands: ['workDays', 'ratePerDay'] } }]),
  ],
  signatureBlocks: BLOCKS5,
  headerFields: [{ id: 'subjectLine', label: 'เรื่อง', type: 'text' }, { id: 'docDate', label: 'วันที่', type: 'date' }],
  seqWidth: 10, requesterTitle: 'ข้อมูลผู้เบิก', itemsTitle: 'รายการค่าใช้จ่าย', showRequester: true, showAmountWords: true,
  showSeq: DEMO !== 'noseq',
  groupId, accessGroups, active: true, createdAt: t('2026-09-18'), updatedAt: t('2026-10-02'),
})
const receiptForm = (formType: string, groupId: string, accessGroups: string[]) => ({
  formType, name: 'ใบรับรองแทนใบเสร็จ', title: 'ใบรับรองแทนใบเสร็จรับเงิน', subject: '', attention: '', formCode: 'GACK769-007',
  categories: [], notes: ['ค่าเดินทาง ค่าพาหนะ กรุณาระบุสถานที่เดินทางไปและเดินทางกลับให้ชัดเจน'],
  columns: [
    { key: 'date', label: 'วัน เดือน ปี', type: 'date', width: 22 },
    { key: 'detail', label: 'รายละเอียดรายจ่าย', type: 'text' },
    { key: 'amount', label: 'จำนวนเงิน', type: 'number', width: 24, isTotal: true },
    { key: 'remark', label: 'หมายเหตุ', type: 'text', width: 30 },
  ],
  headerFields: [{ id: 'docDate', label: 'วันที่', type: 'date' }],
  signatureBlocks: [{ id: 'requester', label: 'ผู้เบิกจ่าย' }, { id: 'approver', label: 'ผู้อนุมัติ' }],
  bodyText: 'ขอรับรองว่า รายจ่ายข้างต้นนี้ไม่อาจเรียกเก็บเป็นใบเสร็จรับเงินจากผู้รับได้ และข้าพเจ้าได้จ่ายไปในงานของทางบริษัท โดยแท้ ตั้งแต่วันที่ {{ตั้งแต่วันที่:วันที่}} ถึงวันที่ {{ถึงวันที่:วันที่}}',
  groupId, accessGroups, active: true, createdAt: t('2026-09-10'), updatedAt: t('2026-09-20'),
})
const simpleForm = (formType: string, name: string, title: string, formCode: string, created: string, groupId = GROUP_MAIN, accessGroups: string[] = []) => ({
  formType, name, title, subject: '', attention: 'ท่านผู้จัดการ', formCode, categories: [], notes: [],
  columns: [
    { key: 'date', label: 'วันที่', type: 'date', width: 22 },
    { key: 'detail', label: 'รายละเอียด', type: 'text' },
    { key: 'amount', label: 'จำนวนเงิน', type: 'number', width: 26, isTotal: true },
  ],
  signatureBlocks: [{ id: 'requester', label: 'ผู้เบิก' }, { id: 'approver', label: 'ผู้อนุมัติ' }],
  groupId, accessGroups, active: true, createdAt: t(created), updatedAt: t(created),
})

type ClaimRow = [string, string, string, number, number, string, string]
const claimItems = (rows: ClaimRow[]) =>
  rows.map(([docDate, pcCode, pcName, workDays, ratePerDay, bank, job]) =>
    ({ docDate, pcCode, pcName, workDays, ratePerDay, bank, job, amountBefore: workDays * ratePerDay }))
const totalsOf = (subtotal: number, text: string, wht = 0) => ({
  columnTotals: {}, grandTotal: subtotal, amountInThaiText: text,
  vatAmount: 0, whtAmount: wht, retentionAmount: 0, netTotal: subtotal - wht,
})
const claimHeader = (subjectLine: string, docDate: string, who = people.me, extra: any = {}) => {
  const [firstName, lastName] = who.name.split(' ')
  return {
    subject: '', categories: ['ค่าเบี้ยเลี้ยง'], companyId: 'globe', firstName, lastName,
    position: who.uid === SOMCHAI ? 'Field Supervisor' : 'เจ้าหน้าที่ประสานงาน', job: 'J2610-015',
    fields: { subjectLine, docDate }, ...extra,
  }
}
const signedBy = (blockId: string, blockLabel: string, p: { uid: string; name: string }, image: string, at: string) =>
  ({ blockId, blockLabel, assignedUid: p.uid, assignedName: p.name, status: 'signed', signatureImage: image, signedAt: t(at) })
const waitingFor = (blockId: string, blockLabel: string, p: { uid: string; name: string }) =>
  ({ blockId, blockLabel, assignedUid: p.uid, assignedName: p.name, status: 'pending' })

const sub = (id: string, formType: string, docNumber: string, header: any, items: any[], totals: any, createdBy: string, created: string, extra: any = {}) => ({
  id, formType, docNumber, header, items, totals, createdBy, createdByEmployeeId: createdBy === SOMCHAI ? 'EMP0123' : 'EMP0456',
  createdAt: t(created), updatedAt: t(created), printCount: 0, lastPrintedAt: null, signatures: [], attachments: [], ...extra,
})

const db: Record<string, any[]> = {
  companies: [
    { id: 'globe', name: 'บริษัท โกลบ ซินดิเคท (ประเทศไทย) จำกัด', headerName: null, shortName: 'Globe Syndicate', logo: null,
      address: '1252/1 อาคารทรูทาวเวอร์ อาคาร 2 ชั้น 6 ถนนพัฒนาการ แขวงสวนหลวง เขตสวนหลวง กรุงเทพฯ' },
    { id: 'besthrm', name: 'บริษัท เบสท์ เอช อาร์ เอ็ม จำกัด', headerName: null, shortName: 'Best HRM', logo: null, address: '-' },
  ],
  profiles: [
    profile(SOMCHAI, 'EMP0123', 'สมชาย', 'ใจดี', 'Field Supervisor', {
      signatureImage: DEMO === 'nosig' || DEMO === 'first' ? null : SIG_ME,
      mustChangePassword: DEMO === 'first', passwordIsDefault: DEMO === 'first',
    }),
    profile('u-wipa', 'EMP0045', 'วิภา', 'รัตนกุล', 'หัวหน้าแผนก', { signatureImage: SIG_WIPA }),
    profile('u-prasert', 'EMP0007', 'ประเสริฐ', 'วงศ์ทอง', 'ผู้จัดการ', { signatureImage: SIG_PRASERT, department: 'Management', accessGroup: null }),
    profile('u-malee', 'EMP0031', 'มาลี', 'ศรีสุข', 'เจ้าหน้าที่บัญชี', { role: 'admin', department: 'Accounting', accessGroup: null, signatureImage: SIG_PRASERT }),
    profile('u-admin', 'SA-0001', 'ผู้ดูแลระบบ', 'หลัก', 'IT Support', { role: 'admin', isSuperAdmin: true, department: 'IT', accessGroup: null }),
    profile('u-kanok', 'EMP0502', 'กนกพร', 'แสงดี', 'เจ้าหน้าที่ประสานงาน', { accessGroup: 'pcms', mustChangePassword: true, passwordIsDefault: true }),
    profile('u-thana', 'EMP0510', 'ธนวัฒน์', 'ใจกว้าง', 'Graphic Designer', { department: 'Design', mustChangePassword: true, passwordIsDefault: true }),
    profile('u-ratchanee', 'EMP0333', 'รัชนี', 'บุญมา', 'เจ้าหน้าที่บัญชี', { department: 'Accounting', accessGroup: null, companyId: 'besthrm' }),
    profile('u-anucha', 'EMP0456', 'อนุชา', 'พรหมมา', 'เจ้าหน้าที่ประสานงาน', { signatureImage: SIG_ANUCHA, accessGroup: 'pcms', mustChangePassword: true, passwordIsDefault: false }),
  ],
  access_groups: [
    { id: 'pcms', name: 'PcMs', sortOrder: 1, createdAt: t('2026-08-01') },
    { id: 'dx', name: 'Design Experience', sortOrder: 2, createdAt: t('2026-08-01') },
  ],
  form_groups: [
    { id: GROUP_MAIN, name: 'เบิกค่าใช้จ่าย', sortOrder: 1, createdAt: t('2026-08-01'), active: true },
    { id: GROUP_DX, name: 'เบิกค่าใช้จ่าย (DX)', sortOrder: 2, createdAt: t('2026-10-02'), active: true },
  ],
  form_settings: [
    claimForm('f-claim', GROUP_MAIN, []),
    receiptForm('f-receipt', GROUP_MAIN, []),
    // withholding worked out in the table: each line picks its rate
    { ...simpleForm('f-wht', 'ใบเบิกค่าใช้จ่าย (หัก ณ ที่จ่ายในตาราง)', 'ใบขออนุมัติเบิกค่าใช้จ่าย', 'GAC69-006', '2026-10-29'),
      columns: [
        { key: 'date', label: 'วัน เดือน ปี', type: 'date', width: 19 },
        { key: 'detail', label: 'รายละเอียดการจ่าย', type: 'text' },
        { key: 'gross', label: 'จำนวนเงินรวม', type: 'number', width: 25 },
        { key: 'wht', label: 'ภาษีหัก ณ ที่จ่าย', type: 'calc', width: 23, calc: { op: 'whtRow', a: 'gross' } },
        { key: 'net', label: 'จำนวนเงินสุทธิ', type: 'calc', width: 25, isTotal: true, calc: { op: 'subtract', operands: ['gross', 'wht'] } },
      ] },
    simpleForm('f-advance', 'ใบขอเบิกเงินทดรองจ่าย', 'ใบขอเบิกเงินทดรองจ่าย', 'GAC-6704-001', '2026-08-05'),
    simpleForm('f-petty', 'ใบเบิกเงินสดย่อย', 'ใบเบิกเงินสดย่อย', 'GAC-6704-002', '2026-08-06'),
    simpleForm('f-return', 'ใบรับเงินคืนเข้าบริษัท', 'ใบรับเงินคืน', 'GAC6709-008', '2026-08-20'),
    simpleForm('f-report', 'แบบฟอร์มรายงานการทำงาน', 'ใบรายงานการทำงาน', 'GACK769-005', '2026-08-21'),
    simpleForm('f-training', 'แบบฟอร์มการอบรม', 'ใบสรุปรายงานการอบรม', 'GACK769-006', '2026-08-22'),
    claimForm('f-claim-dx', GROUP_DX, ['dx']),
    receiptForm('f-receipt-dx', GROUP_DX, ['dx']),
    simpleForm('f-petty-dx', 'ใบเบิกเงินสดย่อย', 'ใบเบิกเงินสดย่อย', 'GAC-6704-002', '2026-10-02', GROUP_DX, ['dx']),
  ],
  submissions: [
    // finished, nobody asked to sign — the normal case
    sub('s-1', 'f-claim', 'GAC69-005-202610-0004',
      claimHeader('ขออนุมัติเบิกค่าแรง PC ประจำเดือนกันยายน', '2026-10-03'),
      claimItems([
        ['2026-09-30', 'PC-0412', 'นภา แสงทอง', 22, 500, 'กสิกรไทย', 'J2609-021'],
        ['2026-09-30', 'PC-0418', 'ธีรวัฒน์ มั่นคง', 20, 450, 'ไทยพาณิชย์', 'J2609-021'],
      ]),
      totalsOf(20000, 'สองหมื่นบาทถ้วน'), SOMCHAI, '2026-10-03T09:40',
      { updatedAt: t('2026-10-03T10:05'), printCount: 1, lastPrintedAt: t('2026-10-03T10:06'),
        attachments: [{ path: 's-1/a.jpg', name: 'สรุปวันทำงาน PC ก.ย..jpg', size: 284000, type: 'image/jpeg', uploadedAt: t('2026-10-03T09:41') }] }),
    // sent for signing, still waiting on the head of department and the approver
    sub('s-2', 'f-claim', 'GAC69-005-202610-0002',
      claimHeader('ขออนุมัติเบิกค่าเบี้ยเลี้ยงงานอีเวนต์ สาขาบางนา', '2026-10-01', people.me, { whtRate: 3 }),
      claimItems([
        ['2026-09-27', 'PC-0377', 'ศิริพร ทองดี', 3, 2000, 'กรุงเทพ', 'J2609-034'],
        ['2026-09-27', 'PC-0381', 'กิตติ ศรีวงศ์', 3, 2000, 'กสิกรไทย', 'J2609-034'],
        ['2026-09-28', 'PC-0390', 'ปวีณา ใจงาม', 3, 1000, 'กรุงไทย', 'J2609-034'],
      ]),
      totalsOf(15000, 'หนึ่งหมื่นสี่พันห้าร้อยห้าสิบบาทถ้วน', 450), SOMCHAI, '2026-10-01T14:20',
      { signatures: [
        signedBy('requester', 'ผู้เบิก', people.me, SIG_ME, '2026-10-01T14:25'),
        waitingFor('head', 'หัวหน้าแผนก', people.wipa),
        waitingFor('approver', 'ผู้อนุมัติ', people.prasert),
      ] }),
    // everyone signed — locked
    sub('s-3', 'f-claim', 'GAC69-005-202609-0011',
      claimHeader('ขออนุมัติเบิกค่าแรง PC ประจำเดือนสิงหาคม', '2026-09-02'),
      claimItems([['2026-08-31', 'PC-0412', 'นภา แสงทอง', 23, 500, 'กสิกรไทย', 'J2608-019']]),
      totalsOf(11500, 'หนึ่งหมื่นหนึ่งพันห้าร้อยบาทถ้วน'), SOMCHAI, '2026-09-02T11:00',
      { printCount: 2, lastPrintedAt: t('2026-09-04T09:00'), signatures: [
        signedBy('requester', 'ผู้เบิก', people.me, SIG_ME, '2026-09-02T11:05'),
        signedBy('head', 'หัวหน้าแผนก', people.wipa, SIG_WIPA, '2026-09-03T08:50'),
        signedBy('approver', 'ผู้อนุมัติ', people.prasert, SIG_PRASERT, '2026-09-03T16:10'),
      ] }),
    sub('s-4', 'f-receipt', 'GACK769-007-202609-0006',
      { subject: '', categories: [], companyId: 'besthrm', firstName: 'สมชาย', lastName: 'ใจดี', position: 'Field Supervisor', job: 'J2609-034',
        fields: { docDate: '2026-09-27', 'tpl:ตั้งแต่วันที่': '2026-09-26', 'tpl:ถึงวันที่': '2026-09-26' } },
      [
        { date: '2026-09-26', detail: 'ค่าแท็กซี่ ไป-กลับ สำนักงาน – สาขาบางนา', amount: 380, remark: '' },
        { date: '2026-09-26', detail: 'ค่าวินมอเตอร์ไซค์ สถานี BTS – สาขาบางนา', amount: 60, remark: '' },
      ],
      totalsOf(440, 'สี่ร้อยสี่สิบบาทถ้วน'), SOMCHAI, '2026-09-27T17:30'),
    // someone else's documents that name me as a signer
    sub('s-5', 'f-claim', 'GAC69-005-202610-0003',
      claimHeader('ขออนุมัติเบิกค่าแรง PC งานบูธสาขารังสิต', '2026-10-02', people.anucha),
      claimItems([
        ['2026-10-01', 'PC-0501', 'จิราพร มีสุข', 2, 900, 'กสิกรไทย', 'J2610-007'],
        ['2026-10-01', 'PC-0507', 'ภาณุ แก้วใส', 2, 900, 'ไทยพาณิชย์', 'J2610-007'],
      ]),
      totalsOf(3600, 'สามพันหกร้อยบาทถ้วน'), 'u-anucha', '2026-10-02T15:10',
      { signatures: [
        signedBy('requester', 'ผู้เบิก', people.anucha, SIG_ANUCHA, '2026-10-02T15:12'),
        waitingFor('head', 'หัวหน้าแผนก', people.me),
      ] }),
    sub('s-6', 'f-claim', 'GAC69-005-202609-0009',
      claimHeader('ขออนุมัติเบิกค่าแรง PC งานบูธสาขาลาดพร้าว', '2026-09-20', people.anucha),
      claimItems([['2026-09-19', 'PC-0501', 'จิราพร มีสุข', 2, 900, 'กสิกรไทย', 'J2609-030']]),
      totalsOf(1800, 'หนึ่งพันแปดร้อยบาทถ้วน'), 'u-anucha', '2026-09-20T10:00',
      { signatures: [
        signedBy('requester', 'ผู้เบิก', people.anucha, SIG_ANUCHA, '2026-09-20T10:02'),
        signedBy('head', 'หัวหน้าแผนก', people.me, SIG_ME, '2026-09-21T09:15'),
      ] }),
    sub('s-7', 'f-receipt', 'GACK769-007-202610-0001',
      { subject: '', categories: [], companyId: 'globe', firstName: 'มาลี', lastName: 'ศรีสุข', position: 'เจ้าหน้าที่บัญชี', job: 'J2610-002',
        fields: { docDate: '2026-10-04', 'tpl:ตั้งแต่วันที่': '2026-10-03', 'tpl:ถึงวันที่': '2026-10-03' } },
      [{ date: '2026-10-03', detail: 'ค่าแท็กซี่ ไป-กลับ สำนักงาน – ธนาคาร', amount: 260, remark: '' }],
      totalsOf(260, 'สองร้อยหกสิบบาทถ้วน'), 'u-malee', '2026-10-04T10:20', { createdByEmployeeId: 'EMP0031' }),
    sub('s-dx', 'f-claim', 'GAC69-005-202610-0009',
      claimHeader('ค่าใช้จ่ายตรวจงานสินธานี 5-10/10/69', '2026-10-09'),
      (DEMO === 'dxmany' ? (n => Array.from({ length: n }, (_, i) => ({ docDate: '2026-10-05', pcCode: 'PC-0' + (400 + i), pcName: 'ค่าเดินทาง', workDays: '', ratePerDay: '', bank: '', job: 'J2610', amountBefore: 100 + i }))) (20) : null) ?? (DEMO === 'dxlong' ? (n => Array.from({ length: n }, (_, i) => ({ docDate: '2026-10-05', pcCode: '', pcName: 'เงินช่วยเหลือพิธีพราหมณ์ สถานการณ์น้ำท่วม เมื่อวันที่ 28/09/69 รายการที่ ' + (i + 1), workDays: '', ratePerDay: '', bank: '', job: 'เงินช่วยเหลือชีพ', amountBefore: 1000 })))(9) : null) ?? [
        { docDate: '2026-10-05', pcCode: '', pcName: 'เงินช่วยเหลือพิธีพราหมณ์ สถานการณ์น้ำท่วม เมื่อวันที่ 28/09/69', workDays: '', ratePerDay: '', bank: '', job: 'เงินช่วยเหลือชีพ', amountBefore: 5000, 'tax:wht': 1 },
        { docDate: '2026-10-05', pcCode: '', pcName: 'โรงแรมอีเล็กซ์ค่าที่พัก ค่าที่พัก วันที่ 05-08/10/2569 รวม 3 คืน', workDays: '', ratePerDay: '', bank: '', job: '', amountBefore: 1000 },
        { docDate: '2026-10-06', pcCode: '', pcName: 'บจก.แอดริติค ค่าผลิตสติ๊กเกอร์ไดคัทตามแบบ สำหรับติดตั้งงานผนังบูธ Samsung AV', workDays: '', ratePerDay: '', bank: '', job: '', amountBefore: 1500, 'tax:vat': 1, 'tax:wht': 1 },
        { docDate: '2026-10-05', pcCode: '', pcName: 'ค่ารถเช่า ค่าเช่ารถ 05-10/10/69', workDays: '', ratePerDay: '', bank: '', job: 'ค่าเช่ารถ', amountBefore: 2000, 'tax:vat': 1 },
      ],
      totalsOf(9500, 'เก้าพันแปดร้อยแปดสิบบาทถ้วน'), SOMCHAI, '2026-10-09T09:00', { header: { ...claimHeader('ค่าใช้จ่ายตรวจงานสินธานี 5-10/10/69', '2026-10-09'), vat: true, whtRate: 3, whtScope: 'rows' } }),
  ],
  submission_versions: [],
  field_options: [
    { id: 'o1', field: 'department', value: 'Field Operation', sortOrder: 1 },
    { id: 'o2', field: 'department', value: 'Accounting', sortOrder: 2 },
    { id: 'o3', field: 'position', value: 'Field Supervisor', sortOrder: 1 },
    { id: 'o4', field: 'position', value: 'เจ้าหน้าที่ประสานงาน', sortOrder: 2 },
  ],
}
// Version history: every document has its first version; s-1 was edited once.
for (const s of db.submissions) {
  // s-1 started with one row; the second was added in version 2
  const first = s.id === 's-1' ? { items: s.items.slice(0, 1), totals: totalsOf(11000, 'หนึ่งหมื่นหนึ่งพันบาทถ้วน') } : s
  db.submission_versions.push({ id: `v-${s.id}-1`, submissionId: s.id, version: 1, header: s.header, items: first.items, totals: first.totals,
    editedBy: s.createdBy, editedByName: `${s.header.firstName} ${s.header.lastName}`, editedAt: s.createdAt })
}
{
  const s1 = db.submissions[0]
  db.submission_versions.push({ id: 'v-s-1-2', submissionId: 's-1', version: 2, header: s1.header, items: s1.items, totals: s1.totals,
    editedBy: SOMCHAI, editedByName: 'สมชาย ใจดี', editedAt: s1.updatedAt })
}

const KEY: Record<string, string> = {
  companies: 'id', profiles: 'uid', access_groups: 'id', form_groups: 'id', form_settings: 'formType',
  submissions: 'id', submission_versions: 'id', field_options: 'id',
}

// a ⊇ b, the way Postgres jsonb @> reads it
function contains(a: any, b: any): boolean {
  if (Array.isArray(b)) return Array.isArray(a) && b.every(x => a.some((y: any) => contains(y, x)))
  if (b && typeof b === 'object') return !!a && typeof a === 'object' && Object.keys(b).every(k => contains(a[k], b[k]))
  return a === b
}

class Query {
  private filters: ((r: any) => boolean)[] = []
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: any = null
  private mode: 'many' | 'single' | 'maybe' = 'many'
  private head = false
  private orders: [string, boolean][] = []
  private max = Infinity
  private table: string
  constructor(table: string) { this.table = table }
  select(_cols?: string, opts?: { head?: boolean }) { if (opts?.head) this.head = true; return this }
  eq(c: string, v: any) { this.filters.push(r => r[c] === v); return this }
  neq(c: string, v: any) { this.filters.push(r => r[c] !== v); return this }
  in(c: string, vs: any[]) { this.filters.push(r => vs.includes(r[c])); return this }
  is(c: string, v: any) { this.filters.push(r => (r[c] ?? null) === v); return this }
  contains(c: string, v: any) { const needle = typeof v === 'string' ? JSON.parse(v) : v; this.filters.push(r => contains(r[c], needle)); return this }
  match(o: any) { for (const k of Object.keys(o)) this.eq(k, o[k]); return this }
  or() { return this }
  filter() { return this }
  not() { return this }
  gte() { return this }
  lte() { return this }
  ilike() { return this }
  range() { return this }
  order(c: string, o?: { ascending?: boolean }) { this.orders.push([c, o?.ascending !== false]); return this }
  limit(n: number) { this.max = n; return this }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybe'; return this }
  insert(p: any) { this.op = 'insert'; this.payload = p; return this }
  upsert(p: any) { this.op = 'upsert'; this.payload = p; return this }
  update(p: any) { this.op = 'update'; this.payload = p; return this }
  delete() { this.op = 'delete'; return this }

  private run() {
    const rows = (db[this.table] ??= [])
    const key = KEY[this.table] ?? 'id'
    let out: any[]
    if (this.op === 'insert' || this.op === 'upsert') {
      out = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p: any) => {
        const row = { ...p, [key]: p[key] ?? `${this.table}-${Math.random().toString(36).slice(2, 8)}` }
        const i = rows.findIndex(r => r[key] === row[key])
        if (i >= 0) rows[i] = { ...rows[i], ...row }; else rows.push(row)
        return row
      })
    } else {
      out = rows.filter(r => this.filters.every(f => f(r)))
      if (this.op === 'update') out = out.map(r => Object.assign(r, this.payload))
      if (this.op === 'delete') { for (const r of out) rows.splice(rows.indexOf(r), 1) }
    }
    for (const [c, asc] of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1))
    }
    out = out.slice(0, this.max).map(r => structuredClone(r))
    if (this.head) return { data: null, count: out.length, error: null }
    if (this.mode === 'single') return out.length ? { data: out[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
    if (this.mode === 'maybe') return { data: out[0] ?? null, error: null }
    return { data: out, error: null, count: out.length }
  }
  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return new Promise(r => setTimeout(r, 30)).then(() => this.run()).then(resolve, reject)
  }
}

let seq = 4
const rpc = async (name: string, args: any) => {
  await new Promise(r => setTimeout(r, 30))
  switch (name) {
    case 'list_signers':
      return { data: Object.values(people).filter(p => p.uid !== ME).map(p => ({ uid: p.uid, name: p.name })), error: null }
    case 'next_doc_number': return { data: ++seq, error: null }
    case 'assign_signers': {
      const s = db.submissions.find(x => x.id === args.sub_id)
      if (s) s.signatures = [...(s.signatures ?? []).filter((x: any) => x.status === 'signed'), ...args.assignments]
      return { data: null, error: null }
    }
    case 'sign_document': {
      const s = db.submissions.find(x => x.id === args.sub_id)
      const b = s?.signatures?.find((x: any) => x.blockId === args.block_id)
      if (b) Object.assign(b, { status: 'signed', signatureImage: db.profiles.find(p => p.uid === ME)?.signatureImage, signedAt: Date.now() })
      return { data: null, error: null }
    }
    case 'unsign_document': {
      const s = db.submissions.find(x => x.id === args.sub_id)
      const b = s?.signatures?.find((x: any) => x.blockId === args.block_id)
      if (b) { b.status = 'pending'; delete b.signatureImage; delete b.signedAt }
      return { data: null, error: null }
    }
    case 'cancel_signing': {
      const s = db.submissions.find(x => x.id === args.sub_id)
      if (s) s.signatures = []
      return { data: null, error: null }
    }
    case 'increment_print': {
      const s = db.submissions.find(x => x.id === args.sub_id)
      if (s) { s.printCount = (s.printCount ?? 0) + 1; s.lastPrintedAt = Date.now() }
      return { data: null, error: null }
    }
    case 'void_submission': {
      const s = db.submissions.find(x => x.id === args.sub_id)
      if (!s) return { data: null, error: { message: 'ไม่พบเอกสาร' } }
      if (s.voided) return { data: null, error: { message: 'เอกสารนี้ถูกยกเลิกไปแล้ว' } }
      const n = args.replaced_by ? db.submissions.find(x => x.id === args.replaced_by) : null
      if (n) n.replaces = { id: s.id, docNumber: s.docNumber }
      const me = db.profiles.find(p => p.uid === ME)
      s.voided = {
        at: Date.now(), byUid: ME, byName: me ? `${me.firstName} ${me.lastName}` : '', reason: args.reason,
        ...(n ? { replacedById: n.id, replacedByNumber: n.docNumber } : {}),
      }
      s.signatures = (s.signatures ?? []).filter((x: any) => x.status === 'signed')
      return { data: null, error: null }
    }
    case 'unvoid_submission': {
      const s = db.submissions.find(x => x.id === args.sub_id)
      if (s) s.voided = null
      return { data: null, error: null }
    }
    default: return { data: null, error: null }
  }
}

const signedOut = location.pathname.startsWith('/login')
const user = { id: ME, email: 'emp0123@acc.local', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' }
const session = signedOut ? null : { user, access_token: 'demo', refresh_token: 'demo', expires_in: 3600, token_type: 'bearer' }

// files "uploaded" in this page session (path → blob URL), for the demo
const stored: Record<string, string> = {}
const uploads: string[] = []
;(window as any).__demoUploads = uploads
const client: any = {
  from: (table: string) => new Query(table),
  rpc,
  // No mail leaves the demo: everyone asked is reported as having no email.
  functions: {
    invoke: async (_name: string, opts: any) => ({ data: { sent: 0, noEmail: (opts?.body?.uids ?? []).map((u: string) => { const p = db.profiles.find(x => x.uid === u); return p ? `${p.firstName} ${p.lastName}` : u }), failed: [] }, error: null }),
  },
  auth: {
    onAuthStateChange(cb: (e: string, s: any) => void) {
      setTimeout(() => cb('INITIAL_SESSION', session), 0)
      return { data: { subscription: { unsubscribe() {} } } }
    },
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: session?.user ?? null }, error: null }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'demo' } }),
    signOut: async () => ({ error: null }),
    updateUser: async () => ({ data: { user }, error: null }),
    signUp: async () => ({ data: { user: null }, error: null }),
  },
  storage: {
    from: () => ({
      upload: async (path: string, body: Blob) => { stored[path] = URL.createObjectURL(body); uploads.push(path); return { data: { path }, error: null } },
      remove: async () => ({ data: [], error: null }),
      copy: async (from: string, to: string) => { stored[to] = stored[from] ?? '#'; return { data: { path: to }, error: null } },
      createSignedUrl: async (path: string) => ({ data: { signedUrl: stored[path] ?? '#' }, error: null }),
      createSignedUrls: async (paths: string[]) => ({ data: paths.map(path => ({ path, signedUrl: stored[path] ?? '' })), error: null }),
    }),
  },
}

export const supabase = client
export const supabaseSecondary = client
