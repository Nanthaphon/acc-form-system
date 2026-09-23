/* ตัวเลือกตัวกรองของแต่ละเมนู — ยกมาจาก ActionBar.jsx ตอน redesign เป็นธีม v3
   แยกเป็นไฟล์ข้อมูลล้วน ไม่ให้ component file export ค่าคงที่
   (react-refresh/only-export-components) */

export const ASSET_TYPE_OPTIONS = [
  'คอมพิวเตอร์', 'โน๊ตบุ๊ค', 'หน้าจอ', 'แท็บเล็ต/มือถือ', 'ทีวี',
  'ปริ้นเตอร์', 'อุปกรณ์ IT', 'อุปกรณ์สำนักงาน', 'อุปกรณ์เครือข่าย', 'อื่นๆ',
];

export const ASSET_STATUS_OPTIONS = [
  'พร้อมใช้งาน', 'ถูกใช้งาน', 'สำรอง', 'ชำรุดเสียหาย',
  'ไม่สามารถใช้งานได้', 'รอดำเนินการ', 'ตัดจำหน่าย',
];

/* value ที่เก็บกับข้อความที่แสดงไม่เหมือนกัน — ต้องใช้รูปแบบ { value, label } */
export const LICENSE_EXPIRY_OPTIONS = [
  { value: 'หมดอายุแล้ว', label: 'หมดอายุแล้ว' },
  { value: '30', label: 'ใกล้หมดอายุ ≤ 30 วัน' },
  { value: '60', label: 'ใกล้หมดอายุ ≤ 60 วัน' },
  { value: '90', label: 'ใกล้หมดอายุ ≤ 90 วัน' },
  { value: 'ไม่ระบุ', label: 'ไม่ระบุวันหมดอายุ' },
];

export const ACCESSORY_TYPE_OPTIONS = [
  { value: 'เมาส์ (Mouse)', label: 'เมาส์' },
  { value: 'คีย์บอร์ด (Keyboard)', label: 'คีย์บอร์ด' },
  { value: 'อื่นๆ', label: 'อื่นๆ' },
];

/* เกณฑ์สต็อกอุปกรณ์สำนักงาน — ตรงกับตัวกรองเดิมใน ActionBar */
export const OFFICE_STOCK_OPTIONS = [
  { value: 'ปกติ', label: 'ปกติ (> 5)' },
  { value: 'ใกล้หมด', label: 'ใกล้หมด (1–5)' },
  { value: 'หมดสต็อก', label: 'หมดสต็อก (0)' },
];
